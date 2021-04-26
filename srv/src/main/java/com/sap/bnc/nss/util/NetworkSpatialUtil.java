package com.sap.bnc.nss.util;

import org.springframework.stereotype.Component;

@Component
public class NetworkSpatialUtil {
    public String getRandomUUID() {
        return java.util.UUID.randomUUID().toString();
    }

}