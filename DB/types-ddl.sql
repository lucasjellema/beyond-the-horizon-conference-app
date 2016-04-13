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
  , p_speakers  =>  speaker_tbl_t (speaker_t(self.id, self.first_name, self.last_name)) -- only id values matter
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
type tag_t as object (
  id number(10) 
, display_label varchar2(100)
, tcy_id number(10)
, category varchar2(100)
, icon_url varchar2(1000)
, icon  blob
);

create or replace 
type planning_t as object (
  rom_id number(10)
, slt_id number(10)
, room_display_label varchar2(100)
, room_capacity number(4,0)
, room_location_description varchar2(2000)
, slot_display_label varchar2(100)
, slot_start_time timestamp
);

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
, constructor function session_t
              ( title in varchar2
              , speaker  in varchar2
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
            ||', "title" : "'||self.title||'" '
            ||', "abstract" : "'||self.abstract||'" '
            ||', "speakers" : '||bth_speakers_api.json_speaker_tbl_summary(p_speakers => self.speakers)||' '
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
            ||'}';
  return l_json;         
end to_json_summary;


end;



create or replace 
type session_tbl_t as table of session_t;

