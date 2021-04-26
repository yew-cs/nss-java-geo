package com.sap.bnc.nss.dto;

public class ParameterDTO {
    //private String keyName;
    private String key;
    private String value;
    
    /**
     * No args constructor for use in serialization
     *
     */
    public ParameterDTO() {
    }
/*
    public String getKeyName() {
        return keyName;
    }

    public void setKeyName(String keyName) {
        this.keyName = keyName;
    }
*/    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }
    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
