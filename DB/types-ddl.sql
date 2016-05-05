create or replace 
type string_tbl_t as table of varchar2(2000);


create or replace 
type speaker_t force as object (
id number(10)
, first_name  varchar2(500)
, last_name  varchar2(500)
, company  varchar2(500)
, country  varchar2(50)
, biography clob
, salutation varchar2(100)
, community_titles varchar2(500)
, constructor function speaker_t
              ( id in number
              , first_name  in varchar2
              , last_name  in varchar2
              ) return self as result
, member function to_json
  return varchar2		  
, member function to_json_summary
  return varchar2		  
) NOT FINAL
;

create or replace 
type body speaker_t as

constructor function speaker_t
              ( id in number
              , first_name  in varchar2
              , last_name  in varchar2
              ) return self as result
is
begin
  self.id:= id;
  self.first_name:= first_name;
  self.last_name:= last_name;
  return;
end;

member function to_json
return varchar2
is
  l_json    varchar2(32600);
  l_sessions  session_tbl_t := session_tbl_t();
begin
  bth_sessions_api.get_sessions
  ( p_tags => null
  , p_search_term => null
  , p_speakers  =>  '[ {"id":'||self.id||'  , "lastName": "'||self.last_name||'"} ]' 
  , p_sessions => l_sessions
  );
  l_json:= '{'
            ||'"id" : "'||self.id||'" '
            ||', "firstName" : "'||self.first_name||'" '
            ||', "lastName" : "'||self.last_name||'" '
            ||', "country" : "'||self.country||'" '
            ||', "company" : "'||self.company||'" '
            ||', "communityTitles" : "'||self.community_titles||'" '
            ||', "biography" : "'||self.biography||'" '
            ||', "sessions" : '||bth_sessions_api.json_session_tbl_summary(p_sessions => l_sessions)||' '
            ||'}';
  return l_json;         
end to_json;

member function to_json_summary
return varchar2		  
is
  l_json    varchar2(32600);
begin
  l_json:= '{'
            ||'"id" : "'||self.id||'" '
            ||', "firstName" : "'||self.first_name||'" '
            ||', "lastName" : "'||self.last_name||'" '
            ||', "country" : "'||self.country||'" '
            ||', "company" : "'||self.company||'" '
            ||'}';
  return l_json;         
end to_json_summary;

end;




create or replace 
type tag_t force as object (
  id number(10) 
, display_label varchar2(100)
, tcy_id number(10)
, category varchar2(100)
, tag_count number(5,0)
, icon_url varchar2(1000)
, icon  blob
, member function to_json
  return varchar2		  
, member function to_json_summary
  return varchar2		  
) NOT FINAL;

create or replace 
type body tag_t as

member function to_json
return varchar2
is
  l_json    varchar2(32600);
begin
  l_json:= '{'
            ||'"id" : "'||self.id||'" '
            ||', "displayLabel" : "'||self.display_label||'" '
            ||', "category" : "'||self.category||'" '
            ||', "count" : "'||self.tag_count||'" '
            ||', "iconUrl" : "'||self.icon_url||'" '
            ||'}';
  return l_json;         
end to_json;

member function to_json_summary
return varchar2
is
  l_json    varchar2(32600);
begin
  l_json:= '"'||self.display_label||'"';
  return l_json;         
end to_json_summary;


end;


create or replace 
type planning_t force as object (
  id number(10)  
 , rom_id number(10)
, slt_id number(10)
, room_display_label varchar2(100)
, room_capacity number(4,0)
, room_location_description varchar2(2000)
, slot_display_label varchar2(100)
, slot_start_time timestamp
, ssn_id number(10)
, session_title varchar2(500)
, speakers varchar2(500)
, session_duration  number(2,1)
, track varchar2(100)
, constructor function planning_t 
(  rom_id in number
, slt_id in number
, room_display_label in varchar2
, room_capacity in number
, room_location_description in varchar2
, slot_display_label in varchar2
, slot_start_time in timestamp
, ssn_id in number
, session_title in varchar2
, speakers in varchar2
, session_duration in number
, track varchar2
) return self as result
, constructor function planning_t
              ( id in number
              , title in varchar2
              , speakers  in varchar2
              , slt_id in number
              ) return self as result
, map member function map_planning_t
  return number
, member function to_json
  return varchar2
);


create or replace 
type body planning_t as

map member
function map_planning_t
return number
is
begin  
  return 1;
end map_planning_t;  

constructor function planning_t
              ( id in number
              , title in varchar2
              , speakers  in varchar2
              , slt_id in number
              ) return self as result
is
begin
  self.id:= id;
  self.session_title := title;
  self.speakers:= speakers;
  self.slt_id:= slt_id;
  return;
end;

constructor function planning_t 
(  rom_id in number
, slt_id in number
, room_display_label in varchar2
, room_capacity in number
, room_location_description in varchar2
, slot_display_label in varchar2
, slot_start_time in timestamp
, ssn_id in number
, session_title in varchar2
, speakers in varchar2
, session_duration in number
, track in  varchar2
) return self as result
is
begin
  self.rom_id:= rom_id;
  self.slt_id:= slt_id;
  self.ssn_id:= ssn_id;
  self.slot_display_label := slot_display_label; 
  self.room_location_description := room_location_description; 
  self.slot_start_time :=slot_start_time ; 
  self.room_display_label := room_display_label; 
  self.room_capacity :=room_capacity ; 
  self.session_title := session_title;
  self.speakers:= speakers;
  self.session_duration:= session_duration;
  self.track:=track;
  return;
end;


member function to_json
return varchar2
is
  l_json    varchar2(32600);
begin
  l_json:= '{'
            ||'"romId" : "'||self.rom_id||'" '
            ||', "sltId" : "'||self.slt_id||'" '
            ||', "room" : "'||self.room_display_label||'" '
            ||', "roomCapacity" : "'||self.room_capacity||'" '
            ||', "roomLocation" : "'||self.room_location_description||'" '
            ||', "slot" : "'||self.slot_display_label||'" '
            ||', "slotDate" : "'||to_char(self.slot_start_time,'DD-MM-YYYY')||'" '
            ||', "slotStartTime" : "'||to_char(self.slot_start_time,'HH24:MI')||'" '
            ||', "sessionStartTime" : "'||to_char(self.slot_start_time,'HH24:MI')||'" '
            ||', "sessionEndTime" : "'||to_char(self.slot_start_time +nvl(self.session_duration,1)*50/60/24 ,'HH24:MI')||'" '
            ||', "sessionDuration" : "'||self.session_duration||'" '
            ||', "sessionId" : "'||self.ssn_id||'" '
            ||', "title" : "'||self.session_title||'" '
            ||', "speakers" : "'||self.speakers||'" '
            ||'}';
  return l_json;         
end to_json;
end;





create or replace 
type planning_tbl_t as table of planning_t;



create or replace 
type tag_tbl_t as table of tag_t;

create or replace 
type speaker_tbl_t as table of speaker_t;


create or replace 
type session_t force as object (
 id number(10) 
, title varchar2(1000) 
, abstract clob
, target_audience varchar2(500)
, experience_level varchar2(500)
, granularity varchar2(500)
, duration number(2,1) -- 2, 1, 0.5 for MC, regular and quickie
, tags tag_tbl_t
, speakers speaker_tbl_t
, planning planning_t
, session_identifier varchar2(50)  -- identifier used in mobile app and web site submission page
, track varchar2(250) 
, constructor function session_t
              ( title in varchar2
              , speaker  in varchar2
              , track   in varchar2
              ) return self as result
, member function to_json
  return varchar2		  
, member function to_json_summary
  return varchar2		  
) NOT FINAL
;


create or replace 
type body session_t as

constructor function session_t
              ( title in varchar2
              , speaker  in varchar2
              , track   in varchar2
              ) return self as result
is
begin
  self.title:= title;
  self.speakers:= speaker_tbl_t();
  self.track:= track;
  return;
end;

member function to_json
return varchar2
is
  l_json    varchar2(32600);
begin
  l_json:= '{'
            ||'"sessionId" : "'||self.id||'" '
            ||', "title" : "'||self.title||'" '
            ||', "targetAudience" : "'||self.target_audience||'" '
            ||', "duration" : "'||self.duration||'" '
            ||', "experienceLevel" : "'||self.experience_level||'" '
            ||', "granularity" : "'||self.granularity||'" '
            ||', "abstract" : "'||self.abstract||'" '
            ||', "speakers" : '||bth_speakers_api.json_speaker_tbl_summary(p_speakers => self.speakers)||' '
            ||', "tags" : '||bth_tags_api.json_tag_tbl_summary(p_tags => self.tags)||' '
            ||', "planning" : '||case when self.planning is not null then self.planning.to_json else '{}' end||' '
            ||', "sessionAppIdentifier" : "'||nvl(self.session_identifier, self.id)||'" '
            ||', "track" : "'||self.track||'" '
            ||', "themes" : "-" '
            ||'}';
  return l_json;         
end to_json;

 member function to_json_summary
  return varchar2		  
is
  l_json    varchar2(32600);
begin
  l_json:= '{'
            ||'"sessionId" : "'||self.id||'" '
            ||', "title" : "'||self.title||'" '
            ||', "speakers" : '||bth_speakers_api.json_speaker_tbl_summary(p_speakers => self.speakers)||' '
            ||', "tags" : '||bth_tags_api.json_tag_tbl_summary(p_tags => self.tags)||' '
            ||', "track" : "'||self.track||'" '
            ||'}';
  return l_json;         
end to_json_summary;


end;



create or replace 
type session_tbl_t as table of session_t;

