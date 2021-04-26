package com.sap.bnc.nss.handlers;

import java.sql.SQLException;
import java.text.Format;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sap.bnc.nss.dto.ParameterDTO;
import com.sap.cds.ql.Select;
import com.sap.cds.ql.cqn.CqnSelect;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.ServiceName;
import com.sap.cds.services.persistence.PersistenceService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

import cds.gen.nsaa.*;
import cds.gen.configservice.Renderer;
import cds.gen.configservice.Action;
import cds.gen.configservice.Layer;
import cds.gen.configservice.GetConfigContext;
import cds.gen.configservice.NetworkSpatialConfig;
import cds.gen.configservice.BusinessObjectType;
import cds.gen.configservice.Parameters;

@Component
@ServiceName("configService")
public class ConfigServiceHandler implements EventHandler {

    @Autowired
    PersistenceService db;

    @On(event = "getConfig")
    public void onGetConfig(GetConfigContext context)
            throws SQLException, JsonProcessingException, JsonMappingException {

        final ObjectMapper mapper = new ObjectMapper();
        //String filterClientId = (String) context.get("clientId");
        String filterClientId = "76785e66-3032-4a27-b53f-4373dd135ce0";
        NetworkSpatialConfig nsConfig = NetworkSpatialConfig.create();

        /* Select from configuration entities */
        // Renderers
        CqnSelect selectRenderers = Select.from(Renderers_.class).where(a -> a.ClientId().eq(filterClientId));
        
        List<Renderers> renderersResult = db.run(selectRenderers).listOf(Renderers.class);
        List<Renderer> renderersOutputList = new ArrayList<Renderer>();

        // Actions
        CqnSelect selectActions = Select.from(Actions_.class)
                .columns(a -> a._all(), a -> a.BusinessObjectType().expand(), a -> a.ActionType().expand())
                .where(a -> a.ClientId().eq(filterClientId));
        
        List<Actions> actionsResult = db.run(selectActions).listOf(Actions.class);
        List<Action> actionsOutputList = new ArrayList<Action>();

        // Layers
        CqnSelect selectLayers = Select.from(Layers_.class)
                .columns(a -> a._all(), a -> a.ServiceType().expand(), a -> a.LayerType().expand())
                .where(a -> a.ClientId().eq(filterClientId));

        List<Layers> layersResult = db.run(selectLayers).listOf(Layers.class);
        List<Layer> layersOutputList = new ArrayList<Layer>();

        // BusinessObjectTypes
        CqnSelect selectBusinessObjectTypes = Select.from(BusinessObjectTypes_.class).where(a -> a.ClientId().eq(filterClientId));

        List<BusinessObjectTypes> businessObjectTypesResult = db.run(selectBusinessObjectTypes).listOf(BusinessObjectTypes.class);
        List<BusinessObjectType> businessObjectTypesOutputList = new ArrayList<BusinessObjectType>();

        /* Build Renderer Config */
        renderersResult.stream().forEach((record) -> {
            Renderer rendererOutput = Renderer.create();
            BeanUtils.copyProperties(record, rendererOutput);
            renderersOutputList.add(rendererOutput);
        });

        /* Build Actions Config */
        actionsResult.stream().forEach((record) -> {
            Action actionOutput = Action.create();
            List<Parameters> paramsList = new ArrayList<Parameters>();

            /* Build Parameters as JSON */
            if (record.getParameters() != null) {
                try {
                    List<ParameterDTO> paramsDTO = mapper.readValue(record.getParameters(),
                            new TypeReference<List<ParameterDTO>>() {
                            });
                    paramsDTO.stream().forEach((param) -> {
                        Parameters params = Parameters.create();
                        params.setKeyName(param.getKey());
                        params.setValue(param.getValue());
                        paramsList.add(params);
                    });
                } catch (JsonMappingException e) {
                    // TODO: Error handling
                } catch (JsonProcessingException e) {
                    // TODO: Error handling
                }
            }
            /* Copy top level attributes and set Parameters separately */
            final String[] ignoredProperties = { "Parameters" };
            BeanUtils.copyProperties(record, actionOutput, ignoredProperties);
            actionOutput.setParameters(paramsList);
            actionsOutputList.add(actionOutput);
        });

        /* Build Layer Config */
        layersResult.stream().forEach((record) -> {
            Layer layerOutput = Layer.create();
            BeanUtils.copyProperties(record, layerOutput);
            layersOutputList.add(layerOutput);
        });
        
        /* Build BusinessObjectTypes Config */
        businessObjectTypesResult.stream().forEach((record) -> {
            BusinessObjectType businessObjectTypesOutput = BusinessObjectType.create();
            BeanUtils.copyProperties(record, businessObjectTypesOutput);
            businessObjectTypesOutputList.add(businessObjectTypesOutput);
        });

        /* Build Network Spatial Config */
        nsConfig.setVersion("1.0.0");
        nsConfig.setClientId(filterClientId);
        nsConfig.setRenderers(renderersOutputList);
        nsConfig.setActions(actionsOutputList);
        nsConfig.setLayers(layersOutputList);
        nsConfig.setBusinessObjectTypes(businessObjectTypesOutputList);

        context.setResult(nsConfig);

    }
}
