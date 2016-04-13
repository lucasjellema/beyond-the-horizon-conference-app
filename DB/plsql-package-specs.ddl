create or replace
package bth_util
is

c_string_length CONSTANT INTEGER := 1900;     
TYPE string_tbl_type IS TABLE OF VARCHAR2(1900) INDEX BY BINARY_INTEGER;

end bth_util;





create or replace
package bth_sessions_api
is

procedure get_sessions
( p_tags in tag_tbl_t
, p_search_term in varchar2
, p_speakers  in speaker_tbl_t -- only id values matter
, p_sessions out session_tbl_t
);

function get_sessions_json
( p_tags in tag_tbl_t
, p_search_term in varchar2
, p_speakers  in speaker_tbl_t -- only id values matter
) return clob
;

function get_sessions_json_tbl
( p_tags in bth_util.string_tbl_type
, p_search_term in varchar2
, p_speakers  in bth_util.string_tbl_type -- only id values matter
) return bth_util.string_tbl_type
;

function get_sessions_json_string_tbl
( p_tags in varchar2
, p_search_term in varchar2
, p_speakers  in varchar2 
) return  string_tbl_t
;

function json_session_tbl_summary
( p_sessions in session_tbl_t
) return clob;

function get_ssn_details_json_str_tbl
( p_session_id in number
) return  string_tbl_t
;


end bth_sessions_api;


create or replace
package bth_speakers_api
is

c_string_length CONSTANT INTEGER := 1900;     
TYPE string_tbl_type IS TABLE OF VARCHAR2(1900) INDEX BY BINARY_INTEGER;


procedure get_speakers
( p_tags in tag_tbl_t
, p_search_term in varchar2
, p_speakers out speaker_tbl_t
);

function get_speakers_json
( p_tags in tag_tbl_t
, p_search_term in varchar2
) return clob
;
function get_speakers_json_string_tbl
( p_tags in tag_tbl_t
, p_search_term in varchar2
) return string_tbl_t
;

function json_speaker_tbl_summary
( p_speakers in speaker_tbl_t
) return clob;


end bth_speakers_api;



declare
  l_sessions_tbl session_tbl_t;
begin
  bth_sessions_api.get_sessions( p_tags => null, p_search_term => null, p_speakers => null, p_sessions => l_sessions_tbl);
  for i in l_sessions_tbl.first .. l_sessions_tbl.last loop
    dbms_output.put_line('Session '|| l_sessions_tbl(i).title);
  end loop;
end;

declare
  l_sessions_tbl bth_sessions_api.string_tbl_type;
begin
  l_sessions_tbl := bth_sessions_api.get_sessions_json_tbl( p_tags => null, p_search_term => null, p_speakers => null);
  for i in 1 .. l_sessions_tbl.last loop
    dbms_output.put_line('Session '|| l_sessions_tbl(i));
  end loop;
end;

select *
from   table( bth_sessions_api.get_sessions_json_string_tbl( p_tags => null, p_search_term => null, p_speakers => null))


declare
  l_speakers_tbl speaker_tbl_t;
begin
  bth_speakers_api.get_sessions( p_tags => null, p_search_term => null,  p_speakers => l_speakers_tbl);
  for i in l_speakers_tbl.first .. l_speakers_tbl.last loop
    dbms_output.put_line('Speaker '|| l_speakers_tbl(i).first_name);
  end loop;
end;

select *
from   table( bth_speakers_api.get_speakers_json_string_tbl( p_tags => null, p_search_term => null))
