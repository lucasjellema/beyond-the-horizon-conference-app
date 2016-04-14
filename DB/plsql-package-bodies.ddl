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


end bth_util;


