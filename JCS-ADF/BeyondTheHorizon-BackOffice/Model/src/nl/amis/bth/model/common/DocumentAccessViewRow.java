package nl.amis.bth.model.common;

import oracle.jbo.Row;
import oracle.jbo.domain.BlobDomain;
// ---------------------------------------------------------------------
// ---    File generated by Oracle ADF Business Components Design Time.
// ---    Sun May 01 17:10:38 CEST 2016
// ---------------------------------------------------------------------
public interface DocumentAccessViewRow extends Row {
    BlobDomain getContentData();

    void setContentData(BlobDomain value);

    String getContentType();

    void setContentType(String value);

    String getDescription();

    void setDescription(String value);

    Long getId();

    void setId(Long value);

    Long getMasterId();

    void setMasterId(Long value);

    String getName();

    void setName(String value);
}

