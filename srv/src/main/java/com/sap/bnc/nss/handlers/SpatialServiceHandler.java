package com.sap.bnc.nss.handlers;

import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.sql.DataSource;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sap.bnc.nss.util.NetworkSpatialUtil;
import com.sap.cds.Result;
import com.sap.cds.ql.Insert;
import com.sap.cds.ql.Select;
import com.sap.cds.ql.cqn.CqnInsert;
import com.sap.cds.ql.cqn.CqnSelect;
import com.sap.cds.services.ErrorStatuses;
import com.sap.cds.services.ServiceException;
import com.sap.cds.services.cds.CdsCreateEventContext;
import com.sap.cds.services.cds.CdsReadEventContext;
import com.sap.cds.services.cds.CdsService;
import com.sap.cds.services.cds.CdsUpdateEventContext;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.After;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.ServiceName;
import com.sap.cds.services.messages.Message;
import com.sap.cds.services.messages.Messages;
import com.sap.cds.services.persistence.PersistenceService;
import com.sap.cds.services.request.UserInfo;
import com.sap.cds.services.utils.StringUtils;

import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;
import org.locationtech.jts.io.WKTWriter;
import org.locationtech.jts.io.geojson.GeoJsonReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
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

    @Autowired
    NamedParameterJdbcTemplate namedJdbcTemplate;

    @Autowired
    Messages messages;

    @Autowired
    UserInfo user;

    final ObjectMapper mapper = new ObjectMapper();

    @On(event = CdsService.EVENT_CREATE, entity = BusinessObjects_.CDS_NAME)
    public void onBusinessObjectCreate(CdsCreateEventContext context, List<BusinessObjects> businessObjects) {
        List<Result> results = new ArrayList<Result>();
        /*
         * Only use custom handler if we have geometries, otherwise let generic handler
         * create the Business Object
         */
        businessObjects.stream().filter(b -> b.getGeometries() != null).forEach((businessObject) -> {
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

            // Handle metaData of a geometry
            geometries.forEach(geometry -> {
                // Throw error if BoGeometry is not available
                if (StringUtils.isEmpty(geometry.getBoGeometry())) {
                    throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, "geom.missing.error");
                }
                geometry.setBoReferenceId(businessObject.getId());
                geometry.putIfAbsent("businessObjectType", businessObject.getBoType());
                geometry.putIfAbsent("appReferenceObjectId", businessObject.getAppReferenceObjectId());
            });

            // Convert support both GeoJSON and WKT. Also validates the data.
            geometries = geometriesConvert(geometries);

            // Throw ServiceException if there are any errors logged
            messages.stream().forEach(message -> {
                if (message.getSeverity().equals(Message.Severity.ERROR))
                    throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, message.getMessage());
            });

            businessObject.setGeometries(geometriesCreate(geometries)); // Create the geometries now

        });
        if (!results.isEmpty() || context.get("skip") != null) {
            context.setResult(businessObjects);
        }
    }

    @On(event = CdsService.EVENT_CREATE, entity = Geometries_.CDS_NAME)
    public void onGeometriesCreate(CdsCreateEventContext context, List<Geometries> geometries) {

        geometries.stream().forEach(geometry -> {
            // Throw error if BoGeometry is not available
            if (StringUtils.isEmpty(geometry.getBoGeometry())) {
                throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, "geom.missing.error");
            }
            /*
             * BO Reference ID if provided must be valid and we need to get some BO details
             * for enriching the metaData of the geometry being updated
             */
            if (!StringUtils.isEmpty(geometry.getBoReferenceId())) {
                String boReferenceId = geometry.getBoReferenceId();
                Optional<BusinessObjects> businessObjectsResult = businessObjectReadById(boReferenceId);
                if (!businessObjectsResult.isPresent()) {
                    messages.error("bo.notfound.error", boReferenceId);
                } else {
                    geometry.putIfAbsent("businessObjectType", businessObjectsResult.get().getBoType());
                    geometry.putIfAbsent("appReferenceObjectId", businessObjectsResult.get().getAppReferenceObjectId());
                }
            }
            geometry = geometryConvert(geometry);
        });

        // Throw ServiceException if there are any errors logged from convert process
        messages.stream().forEach(message -> {
            if (message.getSeverity().equals(Message.Severity.ERROR))
                throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, message.getMessage());
        });
        context.setResult(geometriesCreate(geometries));

    }

    @On(event = CdsService.EVENT_UPDATE, entity = Geometries_.CDS_NAME)
    public void onGeometriesUpdate(CdsUpdateEventContext context, List<Geometries> geometries) {

        geometries.stream().forEach(geometry -> {
            /*
             * BO Reference ID if provided must be valid and we need to get some BO details
             * for enriching the metaData of the geometry being updated
             */
            if (!StringUtils.isEmpty(geometry.getBoReferenceId())) {
                String boReferenceId = geometry.getBoReferenceId();
                Optional<BusinessObjects> businessObjectsResult = businessObjectReadById(boReferenceId);
                if (!businessObjectsResult.isPresent()) {
                    messages.error("bo.notfound.error", boReferenceId);
                } else {
                    geometry.putIfAbsent("businessObjectType", businessObjectsResult.get().getBoType());
                    geometry.putIfAbsent("appReferenceObjectId", businessObjectsResult.get().getAppReferenceObjectId());
                }
            }
            geometry = geometryConvert(geometry);

        });

        // Throw ServiceException if there are any errors logged
        messages.stream().forEach(message -> {
            if (message.getSeverity().equals(Message.Severity.ERROR))
                throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, message.getMessage());
        });

        context.setResult(geometriesUpdate(geometries));

    }

    @After(event = CdsService.EVENT_READ, entity = BusinessObjects_.CDS_NAME)
    public void afterBusinessObjectsRead(CdsReadEventContext context, List<BusinessObjects> businessObjects) {

        // Enrich geometries with metadata information if available
        businessObjects.stream().filter(b -> b.getGeometries() != null).forEach(businessObject -> {
            businessObject.setGeometries(geometriesMetadataRead(businessObject.getGeometries()));
        });
        context.setResult(businessObjects);
    }

    @After(event = CdsService.EVENT_READ, entity = Geometries_.CDS_NAME)
    public void onGeometriesRead(CdsReadEventContext context, List<Geometries> geometries) {

        // Enrich geometries with metadata information
        context.setResult(geometriesMetadataRead(geometries));
    }

    /**
     * Creates a Business Object
     * 
     * @param businessObject a Business Object
     * @return com.sap.cds.Result after creating the Business Object
     */
    private Result businessObjectCreate(BusinessObjects businessObject) {
        if (businessObject.getId() == null) {
            businessObject.setId(util.getRandomUUID()); // Set UUID if not provided
        }
        CqnInsert insert = Insert.into(BusinessObjects_.CDS_NAME).entry(businessObject);
        return db.run(insert);
    }

    /**
     * Reads a Business Object by ID
     * 
     * @param businessObjectId a Business Object ID
     * @return A Business Object or null if not found
     */
    private Optional<BusinessObjects> businessObjectReadById(String businessObjectId) {
        CqnSelect selectBusinessObject = Select.from(BusinessObjects_.class).limit(1)
                .columns(a -> a.ID(), a -> a.boType(), a -> a.appReferenceObjectId())
                .where(b -> b.ID().eq(businessObjectId));

        return db.run(selectBusinessObject).first(BusinessObjects.class);
    }

    /**
     * Convert geometries to WKT. Also validate that the Geometries are valid
     * geoJSON or WKT. This is also where the metaData will be enriched to include
     * geometry and BO ID in the JSON object for reference later.
     * 
     * @param geometries the geometries list
     * @return converted list of geometries
     */
    private List<Geometries> geometriesConvert(List<Geometries> geometries) {
        geometries.stream().forEach((geometry) -> {
            geometryConvert(geometry);
        });

        return geometries;
    }

    /**
     * Convert geometry to WKT. Also validate that the Geometry is valid geoJSON or
     * WKT. This is also where the metaData will be enriched to include geometry and
     * BO ID in the JSON object for reference later.
     * 
     * @param geometry the geometry to be converted
     * @return converted geometry
     */
    private Geometries geometryConvert(Geometries geometry) {
        // Check that boGeometry is available to be converted
        if (!StringUtils.isEmpty(geometry.getBoGeometry())) {
            WKTReader wktReader = new WKTReader();
            WKTWriter wktWriter = new WKTWriter();
            GeoJsonReader geojsonReader = new GeoJsonReader();
            // Handle geojson format. Convert to WKT.
            try {
                if (geojsonReader.read(geometry.getBoGeometry()).isValid()) {
                    geometry.setBoGeometry(wktWriter.write(geojsonReader.read(geometry.getBoGeometry())));
                }
            } catch (ParseException e) {
                // Parse errors are acceptable here
            }

            // By now all geometries should be valid WKT, if not log as error.
            try {
                Geometry wktGeometry = wktReader.read(geometry.getBoGeometry());
                if (wktGeometry == null || !wktGeometry.isValid()) {
                    messages.error("geom.parse.error", geometry.getBoGeometry());
                }
            } catch (ParseException e) {
                // Log invalid geometries in the CDS Messages API
                messages.error("geom.parse.error", geometry.getBoGeometry());
            }
        }
        // TODO: metadata handling probably should be moved out

        // Try to fetch existing metadata if ID not empty else
        // Generate a UUID for Geometry
        if (!StringUtils.isEmpty(geometry.getId())) {
            geometry = geometryMetadataRead(geometry);
        } else {
            geometry.setId(util.getRandomUUID());
        }

        if (StringUtils.isEmpty(geometry.getMetaData())) {
            geometry.setMetaData("{}");
        }
        geometry.setMetaData(metadataEnrich(geometry));

        return geometry;
    }

    /**
     * Creates a list of Geometries using a HANA stored procedure. The geometry's
     * metadata if provided is also created separately into the HANA document store.
     * 
     * @param geometries a list of geometries to be created.
     * @return The geometries that has been created.
     */
    private List<Map<String, Object>> geometriesCreate(List<Geometries> geometries) {
        List<Map<String, Object>> outputList = new ArrayList<Map<String, Object>>();

        String docuInsertSQL = "INSERT INTO NSS_METADATA VALUES(:metaData)";

        // TODO: Figure out if it is possible to not explicitly declare all procedures -
        // Is there ColumnMetaDataAccess support HANA?
        SimpleJdbcCall createGeometry = new SimpleJdbcCall(ds).withProcedureName("CreateGeometry")
                .withoutProcedureColumnMetaDataAccess().declareParameters(new SqlParameter("ID", Types.NVARCHAR),
                        new SqlParameter("CREATEDAT", Types.TIMESTAMP), new SqlParameter("CREATEDBY", Types.NVARCHAR),
                        new SqlParameter("MODIFIEDAT", Types.TIMESTAMP), new SqlParameter("MODIFIEDBY", Types.NVARCHAR),
                        new SqlParameter("BOCONTEXT", Types.NVARCHAR),
                        new SqlParameter("ISMARKEDFORDELETION", Types.BOOLEAN),
                        new SqlParameter("BOREFERENCE_ID", Types.NVARCHAR), new SqlParameter("BOGEOMETRY", Types.CLOB));

        // TODO: CreatedBy ModifiedBy from UAA. CreatedAt ModifiedAt currently set to
        // now() in hdbprocedure
        geometries.stream().forEach((geometry) -> {
            SqlParameterSource params = new MapSqlParameterSource().addValue("ID", geometry.getId())
                    .addValue("CREATEDAT", null).addValue("CREATEDBY", null).addValue("MODIFIEDAT", null)
                    .addValue("MODIFIEDBY", null).addValue("BOCONTEXT", geometry.getBoContext())
                    .addValue("ISMARKEDFORDELETION", geometry.getIsMarkedForDeletion())
                    .addValue("BOREFERENCE_ID", geometry.getBoReferenceId())
                    .addValue("BOGEOMETRY", geometry.getBoGeometry()).addValue("metaData", geometry.getMetaData());
            createGeometry.execute(params);
            // Insert metadata to Document Store
            if (!StringUtils.isEmpty(geometry.getMetaData())) {
                namedJdbcTemplate.update(docuInsertSQL, params);
            }
            outputList.add(geometry);
        });
        return outputList;
    }

    /**
     * Update a list of Geometries using JdbcTemplate.
     * 
     * @param geometries a list of Geometries to be updated.
     * @return The list of Geometries that has been updated.
     */
    private List<Geometries> geometriesUpdate(List<Geometries> geometries) {
        String docuDeleteSQL = "DELETE FROM NSS_METADATA WHERE \"geometry_id\" = :id";
        String docuInsertSQL = "INSERT INTO NSS_METADATA VALUES(:metaData)";

        geometries.stream().forEach(geometry -> {
            StringBuilder updateSQL = new StringBuilder();

            SqlParameterSource params = new MapSqlParameterSource().addValue("id", geometry.getId())
                    .addValue("modifiedAt", Instant.now()).addValue("modifiedBy", "User")
                    .addValue("boContext", geometry.getBoContext())
                    .addValue("isMarkedForDeletion", geometry.getIsMarkedForDeletion())
                    .addValue("boReference_Id", geometry.getBoReferenceId())
                    .addValue("boGeometry", geometry.getBoGeometry()).addValue("metaData", geometry.getMetaData());

            // Build the Update SQL
            updateSQL.append("UPDATE NSS_GEOMETRIES SET MODIFIEDAT = :modifiedAt, MODIFIEDBY = :modifiedBy");
            if (geometry.getBoContext() != null) {
                updateSQL.append(", BOCONTEXT = :boContext");
            }
            if (geometry.getIsMarkedForDeletion() != null) {
                updateSQL.append(", ISMARKEDFORDELETION = :isMarkedForDeletion");
            }
            if (geometry.getBoReferenceId() != null) {
                updateSQL.append(", BOREFERENCE_ID = :boReference_Id");
            }
            if (geometry.getBoGeometry() != null) {
                updateSQL.append(", BOGEOMETRY = ST_GEOMFROMTEXT(:boGeometry, 4326)");
            }
            updateSQL.append(" WHERE ID = :id");

            namedJdbcTemplate.update(updateSQL.toString(), params);
            // Update metadata to Document Store

            if (!StringUtils.isEmpty(geometry.getMetaData())) {
                /*
                 * Delete & Insert the metaData, somehow Update command on HANA DocuStore via
                 * JdbcTemplate returns an error 'feature not supported: please specify the
                 * types for parameter'
                 */
                namedJdbcTemplate.update(docuDeleteSQL, params);
                namedJdbcTemplate.update(docuInsertSQL, params);
            }
        });

        return geometries;

    }

    /**
     * Read the metadata of the passed in Geometries from the HANA DocuStore if
     * there is any and return the Geometries with the metadata information.
     * 
     * @param geometries the geometries list
     * @return geometries enriched with metadata
     */
    private List<Geometries> geometriesMetadataRead(List<Geometries> geometries) {
        // TODO: should return metadata string, and not entire geometry

        geometries.stream().forEach(geometry -> {
            geometry = geometryMetadataRead(geometry);
        });

        return geometries;
    }

    /**
     * Read the metadata of the passed in Geometry from the HANA DocuStore if there
     * is any and return the Geometry with the metadata information.
     * 
     * @param geometry a Geometry
     * @return a geometry enriched with metadata
     */
    private Geometries geometryMetadataRead(Geometries geometry) {
        // TODO: should return metadata string, and not entire geometry
        String docuSelectSQL = "SELECT NSS_METADATA FROM NSS_METADATA";

        /*
         * JdbcTemplate with ? parameters will error with
         * "feature not supported: please specify the types for parameter"
         */
        List<String> metaData = jdbcTemplate.queryForList(
                docuSelectSQL.concat(" WHERE \"geometry_id\" = '" + geometry.getId() + "'"), String.class);

        if (metaData.size() > 0) {
            geometry.put("metaData", metaData.get(0));
        }

        return geometry;
    }

    /**
     * Enrich the Geometry metadata with the geometry ID and business object ID
     * 
     * @param geometry a single Geometry object
     * @return java.lang.String the Geometry's enriched metadata JSON stringified
     */
    private String metadataEnrich(Geometries geometry) {
        try {
            // Convert JSON String to Map
            Map<String, Object> metaData = mapper.readValue(geometry.getMetaData(),
                    new TypeReference<HashMap<String, Object>>() {
                    });
            /*
             * Put geometry and BO ID's, and other relevant information into metadata so
             * that we can link between the Geometry object and its metadata stored
             * separately in the HANA DocuStore
             */
            metaData.put("geometry_id", geometry.getId());
            Object metaDataBusinessObjectId = metaData.get("business_object_id");
            String geometryBusinessObjectId = geometry.getBoReferenceId();
            if (geometryBusinessObjectId != null) {
                if (metaDataBusinessObjectId == null) {
                    metaData.put("business_object_id", geometryBusinessObjectId.toString());
                }
                /*
                 * For Update scenarios, metaData will be updated only if the value has changed
                 * on the Geometry
                 */
                else if (metaDataBusinessObjectId != null
                        && !metaDataBusinessObjectId.toString().equals(geometryBusinessObjectId.toString())) {
                    metaData.put("business_object_id", geometryBusinessObjectId.toString());
                }
            }

            Object metaDataBusinessObjectType = metaData.get("business_object_type");
            Object geometryBusinessObjectType = geometry.get("businessObjectType");
            if (geometryBusinessObjectType != null) {
                if (metaDataBusinessObjectType == null) {
                    metaData.put("business_object_type", geometryBusinessObjectType.toString());
                }
                /*
                 * For Update scenarios, metaData will be updated only if the value has changed
                 * on the Geometry
                 */
                else if (metaDataBusinessObjectType != null
                        && !metaDataBusinessObjectType.toString().equals(geometryBusinessObjectType.toString())) {
                    metaData.put("business_object_type", geometryBusinessObjectType.toString());
                }
            }

            Object metaDataAppReferenceObjectId = metaData.get("app_reference_object_id");
            Object geometryAppReferenceObjectId = geometry.get("appReferenceObjectId");
            if (geometryAppReferenceObjectId != null) {
                if (metaDataAppReferenceObjectId == null) {
                    metaData.put("app_reference_object_id", geometryAppReferenceObjectId.toString());
                }
                /*
                 * For Update scenarios, metaData will be updated only if the value has changed
                 * on the Geometry
                 */
                else if (metaDataAppReferenceObjectId != null
                        && !metaDataAppReferenceObjectId.toString().equals(geometryAppReferenceObjectId.toString())) {
                    metaData.put("app_reference_object_id", geometryAppReferenceObjectId.toString());
                }
            }
            return mapper.writeValueAsString(metaData);
        } catch (JsonProcessingException e) {
            messages.error("metadata.parse.error", geometry.getMetaData());
        }
        return null;
    }
}
