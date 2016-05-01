package nl.amis.bth.view.documents;

import oracle.jbo.domain.BlobDomain;

/**
 * This type class holds the BlogDomain and a path to a temporary file holding the uploaded image data
 */
public class UploadBlob {
    /**
     * Holds the uploaded data
     */
    BlobDomain dataBlob;

    /**
     * Path to the temporary file if availabe
     */
    String tempFile;

    /**
     * C'tor.
     */
    public UploadBlob() {
        super();
        tempFile = null;
        dataBlob = null;
    }

    /**
     * Gets the status of the temporary file
     *
     * @return true if a temporary file is available, false otherwise
     */
    public Boolean getTempFileAvailabe() {
        return (tempFile != null ? Boolean.TRUE : Boolean.FALSE);
    }

    /**
     * @param inageBlob
     */
    public void setInageBlob(BlobDomain dataBlob) {
        this.dataBlob = dataBlob;
    }

    /**
     * Gets the BlobDomain holding the uploaded data
     * @return
     */
    public BlobDomain getDataBlob() {
        return dataBlob;
    }

    /**
     * Sete the path to the temporary file holding the uploaded data
     * @param tempFile path to the temporary file
     */
    public void setTempFile(String tempFile) {
        this.tempFile = tempFile;
    }

    /**
     * Getter for path to temp file holding the data of the uploaded data
     * @return path to the temporary file holding the uploaded data
     */
    public String getTempFile() {
        return tempFile;
    }
}
