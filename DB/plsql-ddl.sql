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
) return varchar2 
;
end bth_sessions_api;

create or replace
package body bth_sessions_api
is


function session_tbl_json
( p_sessions in session_tbl_t)
return varchar2
is
  l_json varchar2(32000);
begin
  l_json:='';
  for i in p_sessions.first .. p_sessions.last loop
    l_json := l_json||', '||p_sessions(i).to_json;
  end loop;
  l_json := '{"sessions": ['||ltrim(l_json,',')||'] }';
  return l_json;
end session_tbl_json;

procedure get_sessions
( p_tags in tag_tbl_t
, p_search_term in varchar2
, p_speakers  in speaker_tbl_t -- only id values matter
, p_sessions out session_tbl_t
) is
  l_sessions session_tbl_t;
begin
  select session_t(
   id 
, title 
, abstract 
, target_audience 
, experience_level
, granularity 
, duration 
, null /*tags */
, null /* speakers speaker_tbl_t */
, null /*planning planning_t */
)
bulk collect into l_sessions
  from bth_sessions
  ;
  p_sessions := l_sessions;
end get_sessions;

function get_sessions_json
( p_tags in tag_tbl_t
, p_search_term in varchar2
, p_speakers  in speaker_tbl_t -- only id values matter
) return varchar2 
is
  l_sessions session_tbl_t:= session_tbl_t();
  
begin
  get_sessions( p_tags => p_tags, p_search_term => p_search_term, p_speakers => p_speakers, p_sessions => l_sessions);
  return session_tbl_json( p_sessions => l_sessions);
end get_sessions_json;


end bth_sessions_api;

declare
  l_sessions_tbl session_tbl_t;
begin
  bth_sessions_api.get_sessions( p_tags => null, p_search_term => null, p_speakers => null, p_sessions => l_sessions_tbl);
  for i in l_sessions_tbl.first .. l_sessions_tbl.last loop
    dbms_output.put_line('Session '|| l_sessions_tbl(i).title);
  end loop;
end;



create or replace 
type body session_t as

constructor function session_t
              ( title in varchar2
              , speaker  in varchar2
              ) return self as result
is
begin
  self.title:= title;
  self.speakers:= speaker_tbl_t();
  return;
end;

member function to_json
return varchar2
is
  l_json    varchar2(32600);
begin
  l_json:= '{'
            ||'"sessionId" : "'||self.id||'" '
            ||'"title" : "'||self.title||'" '
           -- ||'"abstract" : "'||self.abstract||'" '
            ||'}';
  return l_json;         
end to_json;

end;
