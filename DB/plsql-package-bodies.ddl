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


create or replace
package body bth_speakers_api
is


function speaker_tbl_json
( p_speakers in speaker_tbl_t)
return clob
is
  l_json clob := to_clob('');
begin
  for i in p_speakers.first .. p_speakers.last loop
    l_json := l_json||', '||p_speakers(i).to_json;
  end loop;
  l_json := '['||ltrim(l_json,',')||']';
  return l_json;
end speaker_tbl_json;

function json_speaker_tbl_summary
( p_speakers in speaker_tbl_t
) return clob  
is
l_json clob := to_clob('');
begin
  for i in p_speakers.first .. p_speakers.last loop
    l_json := l_json||', '||p_speakers(i).to_json_summary;
  end loop;
  l_json := '['||ltrim(l_json,',')||']';
  return l_json;
end json_speaker_tbl_summary;



procedure get_speakers
( p_tags in tag_tbl_t
, p_search_term in varchar2
, p_speakers out speaker_tbl_t
) is
  l_speakers speaker_tbl_t;
begin
  select speaker_t(
   p.id 
, p.first_name
, p.last_name
, p.company
, p.country
, p.biography
, p.salutation
, p.community_titles
)
  bulk collect into l_speakers
  from bth_speakers s
       join
       bth_people p
       on (s.psn_id = p.id)
  ;
  p_speakers:= l_speakers;

end get_speakers;  

function get_speakers_json
( p_tags in tag_tbl_t
, p_search_term in varchar2
) return clob
is
  l_speakers speaker_tbl_t:= speaker_tbl_t();
  
begin
  get_speakers( p_tags => p_tags, p_search_term => p_search_term, p_speakers => l_speakers);
  return speaker_tbl_json( p_speakers => l_speakers);
end;

function get_speakers_json_string_tbl
( p_tags in tag_tbl_t
, p_search_term in varchar2
) return string_tbl_t
is
begin
  return bth_util.clob_to_string_tbl_t( get_speakers_json(p_tags => null, p_search_term=> p_search_term));
end get_speakers_json_string_tbl;

end bth_speakers_api;







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
  bulk collect into l_sessions
  from bth_sessions ssn
       join
       bth_speakers skr
       on (ssn.id = skr.ssn_id)
       join
       speakers s       
       on (s.id = skr.psn_id)                    
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