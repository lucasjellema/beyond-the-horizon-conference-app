package nl.amis.bth.view.documents;

import java.io.IOException;

import java.util.logging.Level;

import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;

import oracle.adf.model.servlet.ADFBindingFilter;
import oracle.adf.share.logging.ADFLogger;

public class DocumentsBindingsFilter extends ADFBindingFilter {
    protected transient ADFLogger mLogger = ADFLogger.createADFLogger(DocumentsBindingsFilter.class);

    private void lg(String txt) {
        mLogger.log(Level.WARNING, txt);
        
    }

    public DocumentsBindingsFilter() {
        super();
        mLogger.warning("Documents Filter - constructed");
        lg("fiolter constructed");
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse,
                         FilterChain filterChain) throws IOException, ServletException {
        // TODO Implement this method
        mLogger.warning("Documents Filter - do Filter");
        super.doFilter(servletRequest, servletResponse, filterChain);
        lg("dofilter");
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // TODO Implement this method
        mLogger.info("Documents Filter - init");
        super.init(filterConfig);
        lg("init filter");
    }
}
