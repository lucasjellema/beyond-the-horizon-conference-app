package nl.amis.bth.model;

import java.sql.ResultSet;

import nl.amis.bth.model.common.DocumentAccessView;

import oracle.jbo.Row;
import oracle.jbo.domain.Number;
import oracle.jbo.server.ViewObjectImpl;
import oracle.jbo.server.ViewRowImpl;
import oracle.jbo.server.ViewRowSetImpl;
// ---------------------------------------------------------------------
// ---    File generated by Oracle ADF Business Components Design Time.
// ---    Sun May 01 12:41:09 CEST 2016
// ---    Custom code may be added to this class.
// ---    Warning: Do not modify method signatures of generated methods.
// ---------------------------------------------------------------------
public class DocumentAccessViewImpl extends ViewObjectImpl implements DocumentAccessView {
    /**
     * This is the default constructor (do not remove).
     */
    public DocumentAccessViewImpl() {
    }

    /**
     * Returns the bind variable value for bind_DocumentId.
     * @return bind variable value for bind_DocumentId
     */
    public Number getbind_DocumentId() {
        return (Number) getNamedWhereClauseParam("bind_DocumentId");
    }

    /**
     * Sets <code>value</code> for bind variable bind_DocumentId.
     * @param value value to bind as bind_DocumentId
     */
    public void setbind_DocumentId(Number value) {
        setNamedWhereClauseParam("bind_DocumentId", value);
    }

    public Row getImageById(Number aId)
    {
        setbind_DocumentId(aId);
        executeQuery();
        Row row = first();
        return row;
    }


    /**
     * executeQueryForCollection - overridden for custom java data source support.
     */
    @Override
    protected void executeQueryForCollection(Object qc, Object[] params, int noUserParams) {
        super.executeQueryForCollection(qc, params, noUserParams);
    }

    /**
     * hasNextForCollection - overridden for custom java data source support.
     */
    @Override
    protected boolean hasNextForCollection(Object qc) {
        boolean bRet = super.hasNextForCollection(qc);
        return bRet;
    }

    /**
     * createRowFromResultSet - overridden for custom java data source support.
     */
    @Override
    protected ViewRowImpl createRowFromResultSet(Object qc, ResultSet resultSet) {
        ViewRowImpl value = super.createRowFromResultSet(qc, resultSet);
        return value;
    }

    /**
     * getQueryHitCount - overridden for custom java data source support.
     */
    @Override
    public long getQueryHitCount(ViewRowSetImpl viewRowSet) {
        long value = super.getQueryHitCount(viewRowSet);
        return value;
    }

    /**
     * getCappedQueryHitCount - overridden for custom java data source support.
     */
    @Override
    public long getCappedQueryHitCount(ViewRowSetImpl viewRowSet, Row[] masterRows, long oldCap, long cap) {
        long value = super.getCappedQueryHitCount(viewRowSet, masterRows, oldCap, cap);
        return value;
    }
}

