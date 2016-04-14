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

function get_speaker
( p_speaker_id in number
) return speaker_t is
  l_speaker speaker_t;
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
  into l_speaker
  from bth_speakers s
       join
       bth_people p
       on (s.psn_id = p.id)
  where s.psn_id = p_speaker_id
  ;
  return l_speaker;

end get_speaker;  


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


function get_speaker_json
( p_speaker_id in number
) return clob
is
  l_speaker speaker_t;
  
begin
  return get_speaker( p_speaker_id => p_speaker_id).to_json;
end;


function get_speakers_json_string_tbl
( p_tags in tag_tbl_t
, p_search_term in varchar2
) return string_tbl_t
is
begin
  return bth_util.clob_to_string_tbl_t( get_speakers_json(p_tags => null, p_search_term=> p_search_term));
end get_speakers_json_string_tbl;


function get_skr_details_json_str_tbl
( p_speaker_id in number
) return  string_tbl_t
is
begin
  return bth_util.clob_to_string_tbl_t( get_speaker_json(p_speaker_id => p_speaker_id));
end get_skr_details_json_str_tbl;


end bth_speakers_api;



