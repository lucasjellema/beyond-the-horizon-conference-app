package nl.amis.bth.view.documents;

//import de.hahn.blog.uldl.model.dataaccess.common.ImageAccessViewRow;
//import de.hahn.blog.uldl.model.facade.ULDLAppModuleImpl;
//import de.hahn.blog.uldl.view.util.ContentTypes;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import java.util.Collection;
import java.util.Map;
import java.util.logging.Level;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import nl.amis.bth.model.BthAppModuleImpl;

import nl.amis.bth.model.common.BthDocumentViewRow;

import nl.amis.bth.model.common.DocumentAccessViewRow;

import oracle.adf.model.BindingContext;
import oracle.adf.model.binding.DCBindingContainer;
import oracle.adf.model.dcframe.DataControlFrameImpl;
import oracle.adf.share.logging.ADFLogger;

import oracle.jbo.domain.BlobDomain;
import oracle.jbo.uicli.binding.JUCtrlActionBinding;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
// Apache Commons IO: https://commons.apache.org/proper/commons-io 

public class ImageServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;
    protected transient ADFLogger mLogger = ADFLogger.createADFLogger(ImageServlet.class);

    public void init(ServletConfig config) throws ServletException {
        super.init(config);
    }

    protected BthAppModuleImpl findBthAppModule() {
        BindingContext bindingContext = BindingContext.getCurrent();
        DCBindingContainer amx = bindingContext.findBindingContainer("nl_amis_bth_view_DummyDocsPageDef");
        BthAppModuleImpl am = (BthAppModuleImpl) amx.getDataControl().getApplicationModule();
        return am;
    }

    private void lg(String txt) {
        mLogger.log(Level.WARNING, txt);
        
    }

    public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        StringBuilder sb = new StringBuilder(100);
        String appModuleName = "nl.amis.bth.model.BthAppModule";

        sb.append("ImageServlet ").append(appModuleName);
        lg("image servlet");
        try {
            // get parameter from request
            Map paramMap = request.getParameterMap();
            lg("paramMap"+paramMap);
            oracle.jbo.domain.Number id = null;
            String tmporaryFilePath = "";
            if (paramMap.containsKey("id")) {
                lg("param map contaijns id ");
                String[] pVal = (String[]) paramMap.get("id");
                id = new oracle.jbo.domain.Number(pVal[0]);
                lg("id = "+pVal[0]);
                sb.append(" id=").append(pVal[0]);
            }
            else {lg("paramMap does not contain id");}
            
            // check if we find a temporary file name. In this case we allways use this!
            if (paramMap.containsKey("tmp")) {
                String[] pVal = (String[]) paramMap.get("tmp");
                tmporaryFilePath = pVal[0];
                sb.append(" tmp=").append(pVal[0]);
            }

            OutputStream outputStream = response.getOutputStream();
            InputStream inputStream = null;
            BlobDomain image = null;
            String mimeType = null;
            // no temporary file path given, read everything from DB
            if (tmporaryFilePath.isEmpty()) {
                // get method action from pagedef
                lg("get binding context");
                BindingContext bindingContext = BindingContext.getCurrent();
                lg("bc "+bindingContext);
                lg("class binding context" +bindingContext.getClass().getCanonicalName());
                // result:  oracle.adf.model.servlet.HttpBindingContext
                                                                                
                DCBindingContainer amx = bindingContext.findBindingContainer("nl_amis_bth_view_DummyDocsPageDef");
                lg("amx "+amx);

                JUCtrlActionBinding lBinding = (JUCtrlActionBinding) amx.findCtrlBinding("getImageById");
                lg("lbindfing "+lBinding);

                // set parameter
                lBinding.getParamsMap().put("aId", id);
                lg("put id in lbinding paramsmap");

                // execute method
                lBinding.invoke();
                // get result
                Object obj = lBinding.getResult();
                lg("get result");
/* ava.lang.ClassCastException: nl.amis.bth.model.DocumentAccessViewRowImpl 
 * cannot be cast to nl.amis.bth.model.common.BthDocumentViewRow */
                DocumentAccessViewRow imageRow = (DocumentAccessViewRow) obj;
                lg("check resuylt");

                // Check if a row has been found
                if (imageRow != null) {
                    
                    lg("get blob data");
// Get the blob data
                    image = imageRow.getContentData();
                    lg("get mimetype");

                    mimeType = imageRow.getContentType();
                    lg("mimetype "+mimeType);

                    // if no image data can be found and no temporary file is present then return and do nothing
                    if (image == null) {
                        mLogger.info("No data found !!! (id = " + id + ")");
                        return;
                    }
                    inputStream = image.getInputStream();
                } else {
                    lg("no data found");

                    mLogger.warning("No row found to get image from !!! (id = " + id + ")");
                    return;
                }
                sb.append(" ").append(mimeType).append(" ...");
                mLogger.info(sb.toString());
            } else {
                // read everything from temporary file path
                mimeType = ContentTypes.get(tmporaryFilePath);
                File file = FileUtils.getFile(tmporaryFilePath);
                FileInputStream fileInputStream = FileUtils.openInputStream(file);
                inputStream = fileInputStream;
                lg("prepared inputstream");

            }

            // Set the content-type. Only images are taken into account
            response.setContentType(mimeType + "; charset=utf8");
            lg("write to ouytput");

            IOUtils.copy(inputStream, outputStream);
            if (tmporaryFilePath.isEmpty()) {
                // cloase the blob to release the recources
                image.closeInputStream();
            }
            lg("close streams");

            inputStream.close();
            // flush the outout stream
            lg("flush output stream");

            outputStream.flush();
        } catch (Exception e) {
            mLogger.log(Level.WARNING, "problem on execution: " + e.getMessage(), e);
        } finally {


            mLogger.info("...done!");
        }
    }
}
