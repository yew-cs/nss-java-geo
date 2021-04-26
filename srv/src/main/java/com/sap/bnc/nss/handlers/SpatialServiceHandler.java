package com.sap.bnc.nss.handlers;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import com.sap.bnc.nss.util.NetworkSpatialUtil;
import com.sap.cds.Result;
import com.sap.cds.ql.Expand;
import com.sap.cds.ql.Insert;
import com.sap.cds.ql.Select;
import com.sap.cds.ql.cqn.CqnInsert;
import com.sap.cds.ql.cqn.CqnSelect;
import com.sap.cds.services.cds.CdsCreateEventContext;
import com.sap.cds.services.cds.CdsReadEventContext;
import com.sap.cds.services.cds.CdsService;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.After;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.ServiceName;
import com.sap.cds.services.persistence.PersistenceService;
import com.sap.cds.services.utils.StringUtils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Component;

import cds.gen.spatialservice.BusinessObjects;
import cds.gen.spatialservice.BusinessObjects_;
import cds.gen.spatialservice.Geometries;
import cds.gen.spatialservice.Geometries_;
import cds.gen.spatialservice.SpatialService_;

@Component
@ServiceName(SpatialService_.CDS_NAME)
public class SpatialServiceHandler implements EventHandler {

    @Autowired
    private PersistenceService db;

    @Autowired
    private DataSource ds;

    @Autowired
    NetworkSpatialUtil util;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @On(event = CdsService.EVENT_CREATE, entity = BusinessObjects_.CDS_NAME)
    public void onBusinessObjectCreate(CdsCreateEventContext context, List<BusinessObjects> businessObjects) {
        List<Result> results = new ArrayList<Result>();
        businessObjects.stream().forEach((businessObject) -> {
            /*
             * Only use custom handler if we have geometries, otherwise let generic handler
             * create the Business Object
             */
            if (businessObject.getGeometries() != null) {
                List<Geometries> geometries = businessObject.getGeometries();
                businessObject.setGeometries(null); // We need to create Geometries using custom handler, so set it to
                                                    // null

                List<BusinessObjects> businessObjectsResult = new ArrayList<BusinessObjects>();
                if (businessObject.getAppReferenceObjectId() != null) {
                    CqnSelect selectBusinessObject = Select.from(BusinessObjects_.class)
                            .where(a -> a.appReferenceObjectId().eq(businessObject.getAppReferenceObjectId()));
                    businessObjectsResult = db.run(selectBusinessObject).listOf(BusinessObjects.class);
                    if (businessObjectsResult.size() < 1) { // BO does not exist so we will create it
                        results.add(businessObjectCreate(businessObject));
                    } else {
                        businessObject.setId(businessObjectsResult.get(0).getId());
                        context.put("skip", true);
                    }
                } else {
                    results.add(businessObjectCreate(businessObject));
                }

                geometries.forEach(geometry -> {
                    geometry.setBoReferenceId(businessObject.getId());
                });
                businessObject.setGeometries(geometriesCreate(geometries)); // Create the geometries now

            }

        });
        if (!results.isEmpty() || context.get("skip") != null) {
            context.setResult(businessObjects);
        }
    }

    @On(event = CdsService.EVENT_CREATE, entity = Geometries_.CDS_NAME)
    public void onGeometriesCreate(CdsCreateEventContext context, List<Geometries> geometries) {
        context.setResult(geometriesCreate(geometries));
    }

    public Result businessObjectCreate(BusinessObjects businessObject) {
        if (businessObject.getId() == null) {
            businessObject.setId(util.getRandomUUID()); // Set UUID if not provided
        }
        CqnInsert insert = Insert.into(BusinessObjects_.CDS_NAME).entry(businessObject);
        return db.run(insert);
    }

    public List<Map<String, Object>> geometriesCreate(List<Geometries> geometries) {
        List<Map<String, Object>> outputList = new ArrayList<Map<String, Object>>();
        // TODO: Figure out if it is possible to not explicitly declare all procedures -
        // Is there ColumnMetaDataAccess support HANA?
        SimpleJdbcCall createGeometry = new SimpleJdbcCall(ds).withProcedureName("CreateGeometry")
                .withoutProcedureColumnMetaDataAccess().declareParameters(new SqlParameter("ID", Types.NVARCHAR),
                        new SqlParameter("VALIDFROM", Types.TIMESTAMP), new SqlParameter("VALIDTO", Types.TIMESTAMP),
                        new SqlParameter("CREATEDAT", Types.TIMESTAMP), new SqlParameter("CREATEDBY", Types.NVARCHAR),
                        new SqlParameter("MODIFIEDAT", Types.TIMESTAMP), new SqlParameter("MODIFIEDBY", Types.NVARCHAR),
                        new SqlParameter("BOCONTEXT", Types.NVARCHAR),
                        new SqlParameter("ISMARKEDFORDELETION", Types.BOOLEAN),
                        new SqlParameter("BOREFERENCE_ID", Types.NVARCHAR), new SqlParameter("BOGEOMETRY", Types.CLOB));

        // TODO: CreatedBy ModifiedBy from UAA. CreatedAt ModifiedAt currently set to
        // now() in hdbprocedure
        geometries.stream().forEach((geometry) -> {
            geometry.setId(util.getRandomUUID());
            geometry.setValidFrom(Instant.now());
            SqlParameterSource params = new MapSqlParameterSource().addValue("ID", geometry.getId())
                    .addValue("VALIDFROM", geometry.getValidFrom()).addValue("VALIDTO", geometry.getValidTo())
                    .addValue("CREATEDAT", null).addValue("CREATEDBY", null).addValue("MODIFIEDAT", null)
                    .addValue("MODIFIEDBY", null).addValue("BOCONTEXT", geometry.getBoContext())
                    .addValue("ISMARKEDFORDELETION", geometry.getIsMarkedForDeletion())
                    .addValue("BOREFERENCE_ID", geometry.getBoReferenceId())
                    .addValue("BOGEOMETRY", geometry.getBoGeometry());
            createGeometry.execute(params);
            outputList.add(geometry);
        });
        return outputList;
    }

    @After(event = CdsService.EVENT_READ, entity = BusinessObjects_.CDS_NAME)
    public void afterBusinessObjectsRead(CdsReadEventContext context, List<BusinessObjects> businessObjects) {

        String expandQueryParams = context.getParameterInfo().getQueryParams().get("$expand");
        // Only retrieve geometries if query params is expanding geometries
        if (expandQueryParams != null && expandQueryParams.equalsIgnoreCase("geometries")) {
            businessObjects.forEach(businessObject -> {
                businessObject.setGeometries(geometriesRead(businessObject.getId()));
            });
        }
    }

    @On(event = CdsService.EVENT_READ, entity = Geometries_.CDS_NAME)
    public void onGeometriesRead(CdsReadEventContext context) {
        List<Map<String, Object>> geometries = geometriesRead(null);
        context.setResult(geometries);
    }

    public List<Map<String, Object>> geometriesRead(String filterBusinessObject) {
        String sql = "SELECT ID, validFrom, validTo, boReference_ID, boContext, isMarkedForDeletion, boGeometry.St_AsGeoJSON() as boGeometry FROM NSS_GEOMETRIES";
        if (!StringUtils.isEmpty(filterBusinessObject)) {
            sql = sql.concat(" WHERE boReference_ID = '" + filterBusinessObject + "'");
        }
        List<Map<String, Object>> geometries = new JdbcTemplate(ds).queryForList(sql);
        // TODO: Currently explicity casting String and Timestamp attributes, otherwise
        // null will
        // be returned. To be replaced with e.g. Cds accessor interfaces
        geometries.forEach(geometry -> {
            if (geometry.get("validFrom") != null) {
                geometry.replace("validFrom", Timestamp.valueOf(geometry.get("validFrom").toString()));
            }
            if (geometry.get("boGeometry") != null) {
                geometry.replace("boGeometry", geometry.get("boGeometry").toString());
            }
            if (geometry.get("boContext") != null) {
                geometry.replace("boContext", geometry.get("boContext").toString());
            }
            if (geometry.get("boReference_ID") != null) {
                geometry.replace("boReference_ID", geometry.get("boReference_ID").toString());
            }
        });
        return geometries;
    }
}
