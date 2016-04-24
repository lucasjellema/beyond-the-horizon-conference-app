import oracle.adf.model.BindingContext;
import oracle.adf.model.binding.DCBindingContainer;
import oracle.adf.model.binding.DCIteratorBinding;
import oracle.adf.view.rich.component.rich.data.RichTable;

import oracle.jbo.Key;
import oracle.jbo.uicli.binding.JUCtrlHierBinding;

import oracle.jbo.uicli.binding.JUCtrlHierNodeBinding;

import org.apache.myfaces.trinidad.event.SelectionEvent;
import org.apache.myfaces.trinidad.model.CollectionModel;

public class SessionSelectionListener {
    public SessionSelectionListener() {
    }
    private Integer ssnId;
    private String title;

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTitle() {
        return title;
    }

    public void setSpeakers(String speakers) {
        this.speakers = speakers;
    }

    public String getSpeakers() {
        return speakers;
    }

    public void setSlot(String slot) {
        this.slot = slot;
    }

    public String getSlot() {
        return slot;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public String getRoom() {
        return room;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getTime() {
        return time;
    }
    private String speakers;
    private String slot;
    private String room;
    private String time;

    public void setSsnId(Integer ssnId) {
        this.ssnId = ssnId;
    }

    public Integer getSsnId() {
        return ssnId;
    }

    public void customListener(SelectionEvent selectionEvent){
        this.onTableRowSelection(selectionEvent);
        DCBindingContainer bindings =
            (DCBindingContainer)BindingContext.getCurrent().getCurrentBindingsEntry();
        DCIteratorBinding itorBinding =
            bindings.findIteratorBinding("SessionsView1");
        System.out.println(itorBinding.getCurrentRow().getAttribute("SsnId"));
        setSsnId((Integer)itorBinding.getCurrentRow().getAttribute("SsnId"));
        
    }
    
    public void onTableRowSelection(SelectionEvent selectionEvent) {
        RichTable _table = (RichTable ) selectionEvent.getSource(); 
            CollectionModel model = (CollectionModel ) _table.getValue(); 
            JUCtrlHierBinding _binding = (JUCtrlHierBinding) model.getWrappedData(); 
            DCIteratorBinding iteratorBinding = _binding.getDCIteratorBinding(); 
            Object _selectedRowData = _table.getSelectedRowData(); 
            JUCtrlHierNodeBinding node = (JUCtrlHierNodeBinding) _selectedRowData ; 
            Key rwKey = node.getRowKey();
            iteratorBinding.setCurrentRowWithKey(rwKey.toStringFormat(true));
    }
}
