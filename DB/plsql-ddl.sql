create or replace
package bth_sessions_api
is

procedure get_sessions
( p_tags in tag_tbl_t
, p_search_term in varchar2
, p_speakers  in speaker_tbl_t -- only id values matter
, p_sessions out session_tbl_t
);
end bth_sessions_api;

create or replace
package body bth_sessions_api
is

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


end bth_sessions_api;

declare
  l_sessions_tbl session_tbl_t;
begin
  bth_sessions_api.get_sessions( p_tags => null, p_search_term => null, p_speakers => null, p_sessions => l_sessions_tbl);
  for i in l_sessions_tbl.first .. l_sessions_tbl.last loop
    dbms_output.put_line('Session '|| l_sessions_tbl(i).title);
  end loop;
end;
