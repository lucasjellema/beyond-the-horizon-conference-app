
create or replace
package body bth_sessions_api
is

function session_tbl_json
( p_sessions in session_tbl_t)
return clob
is
  l_json clob := to_clob('');
begin
  for i in p_sessions.first .. p_sessions.last loop
    l_json := l_json||', '||p_sessions(i).to_json;
  end loop;
  l_json := '{"sessions": ['||ltrim(l_json,',')||'] }';
  return l_json;
end session_tbl_json;

function json_session_tbl_summary
( p_sessions in session_tbl_t
) return clob
is
l_json clob := to_clob('');
begin
  if p_sessions.count > 0
  then
    for i in p_sessions.first .. p_sessions.last loop
      l_json := l_json||', '||p_sessions(i).to_json_summary;
    end loop;
  end if;
  l_json := '['||ltrim(l_json,',')||']';
  return l_json;
end json_session_tbl_summary;



procedure get_sessions
( p_tags in tag_tbl_t
, p_search_term in varchar2
, p_speakers  in speaker_tbl_t -- only id values matter
, p_sessions out session_tbl_t
) is
  l_sessions session_tbl_t;
  l_count number(10):=0;
  l_speakers   speaker_tbl_t ;
begin
  if p_speakers is not null
  then
     l_count:= p_speakers.count;
  end if;
--select count(*) into l_count
--from table (p_speakers);
  with speakers as (
    select id
    from   table( p_speakers)
    union all
    select psn_id
    from   bth_speakers spr
    where  l_count = 0
  )
  select session_t(
     ssn.id 
   , title||p_search_term
   , abstract    
   , target_audience 
   , experience_level
   , granularity 
   , duration 
   , null /*tags */
   , ( select cast(collect(speaker_t(p.id, p.first_name, p.last_name)) as speaker_tbl_t)
       from   bth_speakers s
              join
              bth_people p
              on (s.psn_id = p.id)
       where  s.ssn_id = ssn.id
     )
   , null /*planning planning_t */
  )
  bulk collect into l_sessions
  from bth_sessions ssn
       join
       bth_speakers skr
       on (ssn.id = skr.ssn_id)
       join
       speakers s       
       on (s.id = skr.psn_id)
  where ( (p_search_term is null or p_search_term ='')
          or
          ( instr(lower(title), lower(p_search_term)) > 0
            or
            instr(lower(abstract), lower(p_search_term)) > 0
            
          ) 
        )                       
  ;
  p_sessions := l_sessions;
end get_sessions;

function get_session
( p_session_id in number
) return session_t
is
  l_session   session_t ;
begin
  select session_t(
     ssn.id 
   , title
   , abstract    
   , target_audience 
   , experience_level
   , granularity 
   , duration 
   , null /*tags */
   , ( select cast(collect(speaker_t(p.id, p.first_name, p.last_name)) as speaker_tbl_t)
       from   bth_speakers s
              join
              bth_people p
              on (s.psn_id = p.id)
       where  s.ssn_id = ssn.id
     )
   , null /*planning planning_t */
  )
   into l_session
  from bth_sessions ssn
where ssn.id = p_session_id  ;
  return l_session;
end get_session;


function get_sessions_json
( p_tags in tag_tbl_t
, p_search_term in varchar2
, p_speakers  in speaker_tbl_t -- only id values matter
) return clob
is
  l_sessions session_tbl_t:= session_tbl_t();
  
begin
  get_sessions( p_tags => p_tags, p_search_term => p_search_term, p_speakers => p_speakers, p_sessions => l_sessions);
  return session_tbl_json( p_sessions => l_sessions);
end get_sessions_json;

function get_session_json
( p_session_id in number
) return clob
is
begin
  return get_session( p_session_id => p_session_id).to_json;
end get_session_json;


function get_sessions_json_tbl
( p_tags in bth_util.string_tbl_type
, p_search_term in varchar2
, p_speakers  in bth_util.string_tbl_type -- only id values matter
) return bth_util.string_tbl_type
is
begin
  return bth_util.clob_to_string_tbl( get_sessions_json(p_tags => null, p_search_term=> p_search_term, p_speakers=> null));
end get_sessions_json_tbl;

function get_sessions_json_string_tbl
( p_tags in varchar2
, p_search_term in varchar2
, p_speakers  in varchar2 
) return  string_tbl_t
is
begin
  return bth_util.clob_to_string_tbl_t( get_sessions_json(p_tags => null, p_search_term=> p_search_term, p_speakers=> null));
end get_sessions_json_string_tbl;

function get_ssn_details_json_str_tbl
( p_session_id in number
) return  string_tbl_t
is
begin
  return bth_util.clob_to_string_tbl_t( get_session_json(p_session_id => p_session_id));
end get_ssn_details_json_str_tbl;



end bth_sessions_api;



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