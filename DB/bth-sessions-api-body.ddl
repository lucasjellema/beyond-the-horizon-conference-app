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
( p_tags in varchar2 -- JSON array: ["SOA","JCS"]
, p_search_term in varchar2
, p_speakers  in varchar2 -- JSON structure: [ {"lastName": "Jellema"} , {"id": 43}]
, p_sessions out session_tbl_t
) is
  l_sessions session_tbl_t;
  l_count number(10):=0;
  l_speakers   speaker_tbl_t ;
  l_tags string_tbl_t:= string_tbl_t();
  l_speakers_json string_tbl_t:= string_tbl_t();
begin
  bth_util.log('get_sessions');
  bth_util.log('tags '||nvl(p_tags,'NULL'));
  bth_util.log('speakers '||nvl(p_speakers,'NULL'));
  bth_util.log('search term '||nvl(p_search_term,'NULL'));
  if p_tags is not null and p_tags <> 'null'
  then
    bth_util.log('go create l_tags from '||nvl(p_tags,'NULL'));
    l_tags:= bth_util.json_array_to_string_tbl (p_json_array => lower(p_tags));
  end if;
  -- turn p_speakers (JSON array) into l_speakers (speaker_tbl_t)
  if p_speakers is not null and p_speakers <> 'null'
  then
    bth_util.log('go create l_speakers from '||nvl(p_speakers,'NULL'));
    with json_doc as 
    ( select p_speakers doc
      from   dual
    )
    SELECT speaker_t(id, firstName, lastName)
    bulk collect into l_speakers
    FROM json_doc
    ,    json_table(doc, '$[*]'
            COLUMNS (id number(10) PATH '$.id'
                    , firstName  VARCHAR2(100) PATH '$.firstName'
                    , lastName  VARCHAR2(100) PATH '$.lastName'
                    )
          ); 
  
     l_count:= l_speakers.count;
  end if;
   bth_util.log('go queryr sessions  ');
 
  with speakers as (
    select distinct id
    from   table( l_speakers)
    union all
    select distinct psn_id
    from   bth_speakers spr
    where  l_count = 0
  ) 
  , sessions as (
    select distinct ssn.id
    from bth_sessions ssn
    where ( (p_search_term is null or p_search_term ='')
          or
          ( instr(lower(title), lower(p_search_term)) > 0
            or
            instr(lower(abstract), lower(p_search_term)) > 0            
          ) 
        )                       
    and l_tags SUBMULTISET OF 
       (  cast (multiset (select lower(tag.display_label)
                          from   bth_tag_bindings tbg
                                 join
                                 bth_tags tag
                                 on (tag.id = tbg.tag_id)
                          where tbg.ssn_id = ssn.id
          ) as string_tbl_t))
    and  lower(ssn.status) = 'accepted'      
  )
  select session_t(
     ssn.id 
   , title
   , null -- abstract
   , target_audience 
   , experience_level
   , granularity 
   , duration 
   , ( select cast(collect(tag_t(t.id, t.display_label,t.tcy_id, tcy.display_label, null,t.icon_url, t.icon )) as tag_tbl_t)
       from   bth_tag_bindings tbg
              join
              bth_tags t
              on (tbg.tag_id = t.id)
              join
              bth_tag_categories tcy
              on
              (t.tcy_id = tcy.id)
       where  tbg.ssn_id = ssn.id
     )
   , ( select cast(collect(speaker_t(p.id, p.first_name, p.last_name)) as speaker_tbl_t)
       from   bth_speakers sp
              join
              bth_people p
              on (sp.psn_id = p.id)
       where  sp.ssn_id = ssn.id
     )
     , ( select planning_t ( rom.id, slt.id, rom.display_label, rom.capacity, rom.location_description, slt.display_label, slt.start_time, pim.ssn_id, ssn.title, null,ssn.duration, tag.display_label)
       from   bth_planning_items pim
              join
              bth_rooms rom
              on (pim.rom_id = rom.id)
              join
              bth_slots slt
              on (pim.slt_id = slt.id)
       where  pim.ssn_id = ssn.id)
     , ssn.submission_identifier
     , tag.display_label
     )
  bulk collect into l_sessions
  from sessions s
       join
       bth_sessions ssn
       on (s.id = ssn.id)
       join
       bth_speakers skr
       on (ssn.id = skr.ssn_id)
       join
       speakers s       
       on (s.id = skr.psn_id)
       left outer join
       bth_tags tag
       on (ssn.track_tag_id = tag.id)
  ;
     bth_util.log('bulk collect done ');
 
  p_sessions := l_sessions;
end get_sessions;

function get_sessions
( p_tags in varchar2
, p_search_term in varchar2
, p_speakers  in varchar2 -- JSON structure: [ {"lastName": "Jellema"} , {"id": 43}]
) return session_tbl_t
 is
  l_sessions session_tbl_t;
begin
  get_sessions
  ( p_tags 
  , p_search_term 
  , p_speakers
  , l_sessions
  );
  return l_sessions;
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
   , ( select cast(collect(tag_t(t.id, t.display_label,t.tcy_id, tcy.display_label, null, t.icon_url, t.icon )) as tag_tbl_t)
       from   bth_tag_bindings tbg
              join
              bth_tags t
              on (tbg.tag_id = t.id)
              join
              bth_tag_categories tcy
              on
              (t.tcy_id = tcy.id)
       where  tbg.ssn_id = ssn.id
     )
   , ( select cast(collect(speaker_t(p.id, p.first_name, p.last_name)) as speaker_tbl_t)
       from   bth_speakers s
              join
              bth_people p
              on (s.psn_id = p.id)
       where  s.ssn_id = ssn.id
     )
     , ( select planning_t ( rom.id, slt.id, rom.display_label, rom.capacity, rom.location_description, slt.display_label, slt.start_time, pim.ssn_id,  ssn.title, null,ssn.duration,tag.display_label)
       from   bth_planning_items pim
              join
              bth_rooms rom
              on (pim.rom_id = rom.id)
              join
              bth_slots slt
              on (pim.slt_id = slt.id)
       where  pim.ssn_id = ssn.id)
     , ssn.submission_identifier
     , tag.display_label
     )
   into l_session
  from bth_sessions ssn
       left outer join
       bth_tags tag
       on (ssn.track_tag_id = tag.id)
where ssn.id = p_session_id  ;
  return l_session;
end get_session;


procedure get_related_sessions
( p_session_id in number
, p_sessions out session_tbl_t
) is
  l_sessions session_tbl_t;
  begin
  bth_util.log('get_related_sessions');
  bth_util.log('session id '||p_session_id);
   bth_util.log('go queryr related sessions  ');

with same_tags as
( select tbg.ssn_id
  ,      tbg.tag_id
  from   bth_tag_bindings tbg
         join
         bth_tag_bindings tbg0
         on
         (tbg.tag_id = tbg0.tag_id)
  where  tbg0.ssn_id = p_session_id  
)
, tag_weight as
( select tag_id
  ,      10* 1/tag_count tag_weight
  from ( select count(*) tag_count
         ,      tag_id
         from   bth_tag_bindings tbg
         group
         by     tag_id
       )
)
, same_speaker as
( select skr.ssn_id
  from   bth_speakers skr
         join
         bth_speakers skr0
         on
         (skr.psn_id = skr0.psn_id)
  where  skr0.ssn_id = p_session_id
)
, scoring_sessions as
( select ssn_id
  ,      tw.tag_weight
  from   same_tags st
         join
         tag_weight tw
         on (tw.tag_id = st.tag_id) 
  union all
  select ssn_id
  ,      3
  from   same_speaker
)
  select session_t(
     ssn.id 
   , title
   , null -- abstract
   , target_audience 
   , experience_level
   , granularity 
   , duration 
   , ( select cast(collect(tag_t(t.id, t.display_label,t.tcy_id, tcy.display_label, null,t.icon_url, t.icon )) as tag_tbl_t)
       from   bth_tag_bindings tbg
              join
              bth_tags t
              on (tbg.tag_id = t.id)
              join
              bth_tag_categories tcy
              on
              (t.tcy_id = tcy.id)
       where  tbg.ssn_id = ssn.id
     )
   , ( select cast(collect(speaker_t(p.id, p.first_name, p.last_name)) as speaker_tbl_t)
       from   bth_speakers s
              join
              bth_people p
              on (s.psn_id = p.id)
       where  s.ssn_id = ssn.id
     )
   , null /*planning planning_t */
     , ssn.submission_identifier
     , tag.display_label
  )
  bulk collect into l_sessions
  from bth_sessions ssn
       join
       ( select rownum rn
         ,      ssn_id
         ,      score
         from   ( select ssn_id   
                  ,      sum(tag_weight)  score
                  from   scoring_sessions
                  group 
                  by     ssn_id
                  order 
                  by     score desc
                )
       ) scs
       on (scs.ssn_id = ssn.id)
       left outer join
       bth_tags tag
       on (ssn.track_tag_id = tag.id)
   where  rn < 8       
   and    ssn_id <> p_session_id
   order
   by     scs.score desc
;


     bth_util.log('bulk collect done ');
 
  p_sessions := l_sessions;
end get_related_sessions;



function get_sessions_json
( p_tags in varchar2
, p_search_term in varchar2
, p_speakers  in varchar2 -- JSON structure: [ {"lastName": "Jellema"} , {"id": 43}]
) return clob
is
  l_sessions session_tbl_t:= session_tbl_t();
  
begin
  bth_util.log(' get_sessions_json');
  get_sessions( p_tags => p_tags, p_search_term => p_search_term, p_speakers => p_speakers, p_sessions => l_sessions);
  return session_tbl_json( p_sessions => l_sessions);
end get_sessions_json;

function get_related_sessions_json
( p_session_id in number
) return clob
is
  l_sessions session_tbl_t:= session_tbl_t();  
begin
  bth_util.log(' get_related_sessions_json');
  get_related_sessions( p_session_id => p_session_id, p_sessions => l_sessions);
  return session_tbl_json( p_sessions => l_sessions);
end get_related_sessions_json;


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
return bth_util.clob_to_string_tbl( to_clob(''));
--  return bth_util.clob_to_string_tbl( get_sessions_json(p_tags => p_tags, p_search_term=> p_search_term, p_speakers=> p_speakers));
end get_sessions_json_tbl;

function get_sessions_json_string_tbl
( p_tags in varchar2
, p_search_term in varchar2
, p_speakers  in varchar2 
) return  string_tbl_t
is
begin
  bth_util.log(' get_sessions_json_string_tbl');
  bth_util.log('tags '||nvl(p_tags,'NULL'));
  bth_util.log('speakers '||nvl(p_speakers,'NULL'));
  bth_util.log('search term '||nvl(p_search_term,'NULL'));
  return bth_util.clob_to_string_tbl_t( get_sessions_json(p_tags => p_tags, p_search_term=> p_search_term, p_speakers=> p_speakers));
end get_sessions_json_string_tbl;

function get_ssn_details_json_str_tbl
( p_session_id in number
) return  string_tbl_t
is
begin
  return bth_util.clob_to_string_tbl_t( get_session_json(p_session_id => p_session_id));
end get_ssn_details_json_str_tbl;

function get_related_json_str_tbl
( p_session_id in number
) return  string_tbl_t
is
begin
  bth_util.log(' get_related_sessions');
  bth_util.log('session id  '||p_session_id);
  return bth_util.clob_to_string_tbl_t( get_related_sessions_json(p_session_id => p_session_id));
end get_related_json_str_tbl;


end bth_sessions_api;


