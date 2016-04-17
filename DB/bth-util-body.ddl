create or replace
package body bth_util
is

function clob_to_string_tbl_t
(p_clob in clob
) return  string_tbl_t
is
  l_index number(10) :=1;
  l_string_tbl string_tbl_t := string_tbl_t();   
  l_str varchar2(5000);
begin
loop
    l_string_tbl.extend;   
    l_str:= substr(p_clob, 1+ (l_index-1)*c_string_length,c_string_length); 
    l_string_tbl(l_string_tbl.last):= l_str;
    if length(p_clob) <= l_index*c_string_length
    then 
      exit;
    else
      l_index:= l_index + 1;
    end if;
    exit when l_index > 500;
  end loop; 
  return l_string_tbl;
end clob_to_string_tbl_t;



function clob_to_string_tbl
(p_clob in clob
) return string_tbl_type
is
  l_index pls_integer :=1;
  l_string_tbl string_tbl_type;   
begin
  loop   
    l_string_tbl(l_index):= substr(p_clob, 1+ (l_index-1)*c_string_length,c_string_length); 
    if length(p_clob) <= l_index*c_string_length
    then 
      exit;
    else
      l_index:= l_index + 1;
    end if;
    exit when l_index > 100;
  end loop; 
  return l_string_tbl;
end clob_to_string_tbl;


-- Define function to split string into tokens
FUNCTION get_token(
    p_input_string IN VARCHAR2,            -- input string
    p_token_number IN PLS_INTEGER,         -- token number
    p_delimiter    IN VARCHAR2 DEFAULT ',' -- separator character
  )
  RETURN VARCHAR2
IS
  v_temp_string VARCHAR2(32767) := p_delimiter || p_input_string ;
  v_pos1 PLS_INTEGER ;
  v_pos2 PLS_INTEGER ;
BEGIN
  v_pos1     := INSTR( v_temp_string, p_delimiter, 1, p_token_number ) ;
  IF v_pos1   > 0 THEN
    v_pos2   := INSTR( v_temp_string, p_delimiter, 1, p_token_number + 1) ;
    IF v_pos2 = 0 THEN
      v_pos2 := LENGTH( v_temp_string ) + 1 ;
    END IF ;
    RETURN( SUBSTR( v_temp_string, v_pos1+1, v_pos2 - v_pos1-1 ) ) ;
  ELSE
    RETURN NULL ;
  END IF ;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;      
END get_token;

FUNCTION get_tokens(
    p_input_string IN VARCHAR2,            -- input string
    p_delimiter    IN VARCHAR2 DEFAULT ',' -- separator character
  )
  RETURN string_tbl_t
 is
  l_string_tbl string_tbl_t:= string_tbl_t();
-- Call the above function in loop for a string with N tokens

      l_token   VARCHAR2(1000) ;
      i          PLS_INTEGER := 1 ;  
    BEGIN
      LOOP
        l_token := get_token( p_input_string, i , ',') ;
        EXIT WHEN l_token IS NULL ;
        l_string_tbl.extend;
        l_string_tbl(l_string_tbl.last):= l_token;  
        i := i + 1 ;
     END LOOP ;
     return l_string_tbl;
  END get_tokens ;
 
 FUNCTION json_array_to_string_tbl (
    p_json_array IN VARCHAR2
    ) RETURN string_tbl_t
    is
      l_string_tbl string_tbl_t:= string_tbl_t();
    begin
       if p_json_array is not null and length(p_json_array)>0
       then            
         l_string_tbl:= get_tokens( rtrim(ltrim(trim(p_json_array),'['),']'));
         for i in l_string_tbl.first..l_string_tbl.last loop
           l_string_tbl(i):= trim(both '"' from trim(both '''' from trim(l_string_tbl(i))));
         end loop;
       end if;
       return l_string_tbl;
    end json_array_to_string_tbl;

procedure log(p_text in varchar2)
is
  pragma autonomous_transaction;
begin  
  insert into log_tbl
  ( time , text)
  values
  (systimestamp, p_text);
  commit;
end log;    


end bth_util;



