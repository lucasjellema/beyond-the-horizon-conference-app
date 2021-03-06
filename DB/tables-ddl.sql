
create sequence bth_seq;



drop table bth_sessions;


create table log_tbl 
( time timestamp
, text varchar2(2000 CHAR)
);


create table bth_sessions
( id number(10) default bth_seq.nextval not null primary key
, title varchar2(1000) not null
, abstract clob
, target_audience varchar2(500)
, experience_level varchar2(500)
, granularity varchar2(500)
, duration number(2,1) -- 2, 1, 0.5 for MC, regular and quickie
, submission_identifier number(5,0)
, status  varchar2(50)
, demos varchar2(2000)
, notes  varchar2(2000)
, track_tag_id  number(10)
);


create table bth_people
( id number(10) default bth_seq.nextval not null primary key
, first_name  varchar2(500)
, last_name  varchar2(500)
, company  varchar2(500)
, job_title  varchar2(500)
, country  varchar2(2)
, email_address  varchar2(200)
, mobile_phone_number  varchar2(50)
, birthdate date
, twitter_handle varchar2(500)
, linkedin_profile varchar2(500)
, facebook_account  varchar2(500) 
, picture blob
, biography clob
, salutation varchar2(100)
, community_titles varchar2(500)
, notes  varchar2(2000)
, picture_doc_id number(10) -- reference to bth_documents
);

create table bth_speakers
( id number(10) default bth_seq.nextval not null primary key
, ssn_id number(10) not null
, psn_id number(10) not null
, contribution varchar2(500)
);

create table bth_rooms
( id number(10) default bth_seq.nextval not null primary key
, display_label varchar2(100)
, capacity number(4,0)
, location_description varchar2(2000)
);

create table bth_slots
( id number(10) default bth_seq.nextval not null primary key
, display_label varchar2(100)
, start_time timestamp
, end_time timestamp
, round_sequence number(2)
);

create table bth_planning_items
( id number(10) default bth_seq.nextval not null primary key
, rom_id number(10)
, slt_id number(10)
, ssn_id  number(10)
);

create table bth_tags
( id number(10) default bth_seq.nextval not null primary key
, display_label varchar2(100)
, tcy_id number(10)
, icon_url varchar2(1000)
, icon  blob
);

create table bth_tag_categories
( id number(10) default bth_seq.nextval not null primary key
, display_label varchar2(500)
);

create table bth_tag_bindings
( id number(10) default bth_seq.nextval not null primary key
, tag_id number(10) not null
, psn_id number(10)
, ssn_id number(10)
);


create table bth_documents
( id number(10) default bth_seq.nextval not null primary key
, name varchar2(500)
, content_type varchar2(100)
, content_data blob
, description varchar2(500)     
, master_id number(10) -- reference to owning record
, purpose varchar2(10) -- indication of the role played by this document for the master
);

-- load demo data

insert into bth_people
( first_name  
, last_name 
, company  
, country  
, email_address  
, biography 
, salutation 
, community_titles 
) select voornaam, achternaam, bedrijfsnaam, land, email,biography, aanhef,communitytitles
from raw_sessions


insert into bth_people
( first_name  
, last_name 
, company  
, country  
, email_address  
, biography 
, community_titles 
, job_title
, mobile_phone_number
) 
select distinct firstname, lastname, companyname, country, email,to_char(bio), communitytitles, jobtitle, telephone
from raws r
where not exists
( select 'x' from bth_people p where lower(p.first_name||'-'||p.last_name) = lower(r.firstname||'-'||r.lastname)
)


-- RAWA3:

insert into bth_people
( first_name  
, last_name 
, company  
, country  
, email_address  
, biography 
, community_titles 
, job_title
, mobile_phone_number
) 
select distinct first_name, last_name, company_name, country, email,to_char(biography), community_titles, job_title, telephone
from raws3 r
where not exists
( select 'x' from bth_people p where lower(p.first_name||'-'||p.last_name) = lower(r.first_name||'-'||r.last_name)
)


-- find duplicate people

select id , first_name, last_name, original_id from (select id, 
 first_name  
, last_name 
, company  
, rank() over (partition by lower(first_name), lower(last_name) order by id) rnk
, first_value(id) over (partition by lower(first_name), lower(last_name) order by id) original_id
from bth_people
)
where rnk > 1

-- update existing people
update bth_people p
set (job_title
, mobile_phone_number) =
( select jobtitle, telephone
from raws rs
where lower(p.first_name||'-'||p.last_name) = lower(rs.firstname||'-'||rs.lastname)
and rownum = 1
)


delete from bth_people where id in (select id  from (select id, 
 first_name  
, last_name 
, company  
, rank() over (partition by lower(first_name), lower(last_name) order by id) rnk
, first_value(id) over (partition by lower(first_name), lower(last_name) order by id) original_id
from bth_people
)
where rnk > 1
)

insert into bth_sessions
( title 
, abstract 
, target_audience 
, experience_level
, granularity 
, duration  -- 2, 1, 0.5 for MC, regular and quickie
, status
, demos
) select
rs.PROPOSALTITLE
, rs.abstrac
, rs.TARGETAUDIENCE
, rs.levelofexperience
, rs.GRANULARITY
, case preferredlength when 'Normal length (45 min)' then 1 when 'Quickie (20 min)' then 0.5 when 'Extended (masterclass) (1h 30 min)' then 2 else 0 end
, rs.status
,  rs.demos
from raws rs
where not exists ( select 'x' from bth_sessions s where lower( s.title) = lower(rs.proposaltitle))


-- update existint sessions with status and demos from RAWS
update bth_sessions s
set (status, demos) =
( select rs.status
,  rs.demos
from raws rs
where lower( s.title) = lower(rs.proposaltitle))

-- create speaker records for main speakers

insert into bth_speakers
( ssn_id 
, psn_id 
, contribution 
)
select s.id 
,      p.id
,      'main'
from  raws rs
      join
      bth_people p
      on (lower(p.first_name||'-'||p.last_name) = lower(rs.firstname||'-'||rs.lastname))
      join 
      bth_sessions s
      on (rs.PROPOSALTITLE = s.title)
      left outer join
      bth_speakers es
      on (s.id = es.ssn_id)
where es.rowid is null -- only insert for sessions for which no speaker records currently exist  



select  p.first_name
,       p.last_name
,       s.title
from    bth_people p
        join
        bth_speakers skr
        on (skr.psn_id = p.id)
        join
        bth_sessions s
        on (skr.ssn_id = s.id)


insert into bth_tag_categories (display_label) values ('content');
insert into bth_tag_categories (display_label) values ('communityTitle');
insert into bth_tag_categories (display_label) values ('track');
insert into bth_tag_categories (display_label) values ('duration');
insert into bth_tag_categories (display_label) values ('experienceLevel');
        
        ID LABEL              
---------- --------------------
       161 content             
       162 communityTitle      
       163 track               
       164 duration            
       165 experienceLevel             
        

-- insert content tags
declare 
  l_tags string_tbl_t := string_tbl_t();
begin
  for r_tags in ( select tags from raws) loop
     l_tags:= l_tags  MULTISET UNION DISTINCT bth_util.get_tokens(r_tags.tags);
  end loop;
 insert into bth_tags
 (display_label, tcy_id)
 select contenttag, 161
 from (
 select distinct ltrim(content_tag) contenttag
 from 
 ( select trim(column_value) content_tag 
   from   table(l_tags) 
 )
 ) ctg
 where not exists (select 'x' from bth_tags tg where lower(tg.display_label) = lower(ctg.contenttag))
 ; 
end;  


declare 
  l_tags string_tbl_t ;
begin
  for r_tags in ( select rs.tags, ssn.id ssn_id 
                  from   raws rs 
                         join
                         bth_sessions ssn
                         on (lower(ssn.title) = lower(rs.PROPOSALTITLE))
                   where ssn.id >      1000   -- only for the newly added sessions
                )                        
             loop
     l_tags:=  bth_util.get_tokens(r_tags.tags);
     insert into bth_tag_bindings
     ( tag_id, ssn_id)
     select tag.id
     ,      r_tags.ssn_id
     from   table (l_tags) tags            
            join
            bth_tags tag
            on ( trim(tags.column_value) = trim(tag.display_label)  and tag.tcy_id = 161)       
            ;
  end loop;
end;



insert into bth_tags (display_label, tcy_id) values ('Quickie', 164);
insert into bth_tags (display_label, tcy_id) values ('Masterclass', 164);
insert into bth_tags (display_label, tcy_id) values ('Regular', 164);

insert into bth_tag_bindings
( tag_id, ssn_id)
select tag.id
,      ssn.id
from   raws rs
       join
       bth_sessions ssn
       on (ssn.title = rs.PROPOSALTITLE)
       join
       bth_tags tag
       on ( instr(lower(rs.preferredlength) , lower(case tag.display_label when 'Regular' then 'Normal' else tag.display_label end  ) )>0 and tag.tcy_id = 164)
where  ssn.id > 1000


       

 insert into bth_tags
 (display_label, tcy_id)
 select distinct granularity_level , 165 
 from raw_sessions
;



 insert into bth_tags
 (display_label, tcy_id)
 select distinct theme , 163 
 from raw_sessions
;
insert into bth_tag_bindings
( tag_id, ssn_id)
select tag.id
,      ssn.id
from   raw_sessions rs
       join
       bth_sessions ssn
       on (ssn.title = rs.PROPOSALTITLE)
       join
       bth_tags tag
       on (rs.theme = tag.display_label and tag.tcy_id = 163)


 insert into bth_tags
 (display_label, tcy_id)
 select distinct experiencelevel, 165 
 from raw_sessions
;

insert into bth_tag_bindings
( tag_id, ssn_id)
select tag.id
,      ssn.id
from   raws rs
       join
       bth_sessions ssn
       on (ssn.title = rs.PROPOSALTITLE)
       join
       bth_tags tag
       on (rs.levelofexperience = tag.display_label and tag.tcy_id = 165)
where ssn.id > 1000
     
  
 -- find duplicate people
 
 select id
,      original_id
from (
select id, first_name, last_name
, row_number() over (partition by first_name||' '||last_name order by id) rn
, first_value(id) over (partition by first_name||' '||last_name order by id) original_id
from  bth_people
)
where rn>1


update bth_speakers
set psn_id = 9
where psn_id =11
      
      
 -- remove duplicate speaker entries:
 delete from bth_speakers
where id in (
select id from (
select id
,      psn_id
,      ssn_id
,      row_number() over (partition by ssn_id, psn_id order by id) rn
from   bth_speakers
)
where rn > 1
)     

-- duplicate sessions:
select * from (
select id
,      title
,      row_number() over (partition by title order by id) rn
from   bth_sessions ssn
)
where rn > 1



-- duplicate tags

select *
from (
select id,
tag
, row_number() over (partition by tag order by id) rn
, first_value(id) over (partition by tag order by id) original_id
from
(
select id, lower(substr(display_label,1,20))  tag
from   bth_tags
order 
by     tag
))
where rn> 1


-- delete duplicate tags
delete bth_tags where id in
(
select id
from (
select id,
tag
, row_number() over (partition by tag order by id) rn
, first_value(id) over (partition by tag order by id) original_id
from
(
select id, lower(substr(display_label,1,20))  tag
from   bth_tags
order 
by     tag
))
where rn> 1
)

with dups as
(select *
from (
select id,
tag
, row_number() over (partition by tag order by id) rn
, first_value(id) over (partition by tag order by id) original_id
from
(
select id, lower(substr(display_label,1,20))  tag
from   bth_tags
order 
by     tag
))
where rn> 1
)
select  dups.tag
,       dups.id
,       dups.original_id
from    dups
join
bth_tag_bindings tbg
on (tbg.tag_id = dups.id)


-- create temporary table

create table t as 
with dups as
(select *
from (
select id,
tag
, row_number() over (partition by tag order by id) rn
, first_value(id) over (partition by tag order by id) original_id
from
(
select id, lower(substr(display_label,1,20))  tag
from   bth_tags
order 
by     tag
))
where rn> 1
)
select  dups.tag
,       dups.id
,       dups.original_id
,       tbg.id tbg_id
from    dups
join
bth_tag_bindings tbg
on (tbg.tag_id = dups.id)


-- update tag bindings from temporary table
update bth_tag_bindings 
set    tag_id = ( select original_id from t where t.tbg_id = bth_tag_bindings.id and t.original_id is not null)
where  exists (select 'x' from t where t.tbg_id = bth_tag_bindings.id and t.original_id is not null)





update bth_tag_bindings tbg
set    tbg.tag_id = (       
select dups.original_id
from   ( select t.id,
                       t.tag
                       , row_number() over (partition by tag order by id) rn
                       , first_value(id) over (partition by tag order by id) original_id
                from   ( select id, lower(substr(display_label,1,20))  tag
                         from   bth_tags t
                         where  t.id = tbg.tag_id
                         order 
                         by     tag
                       ) t              
       ) dups
)

-- check on tag usages for duplicate tags

select count(*) occurrences
,      t.id  tag_id
from (
select *
         from ( select id,
                       tag
                       , row_number() over (partition by tag order by id) rn
                from   ( select id, lower(substr(display_label,1,20))  tag
                         from   bth_tags
                         order 
                         by     tag
                       )
               )
         where rn> 1
         ) t
     left outer join
     bth_tag_bindings tbg
     on (tbg.tag_id = t.id )
group
by    t.id


insert into bth_planning_items
(rom_id, slt_id)
select  r.id
,       s.id
from    bth_rooms r
        cross join
        bth_slots s
where   s.display_label like 'Round%'       



-- get all planned items

select rom.display_label room
,      slt.display_label slot
,      slt.start_time
,      ssn.title session_title
,      ssn.duration session_duration
from   bth_planning_items pim
       join
       bth_rooms rom
       on (pim.rom_id = rom.id)
       join
       bth_slots slt
       on (pim.slt_id = slt.id)
       left outer join
       bth_sessions ssn
       on (pim.ssn_id = ssn.id)
where  slt.display_label like 'Round%'       
and    slt.start_time < to_date('03-06-2016','DD-MM-YYYY') 
order
by     slt.start_time
,      room


-- get all sessions in pivot formated

select *
from (
select rom.display_label room
,      slt.display_label slot
,      slt.start_time
,      pim.id
,      ssn.title session_title
,      ssn.duration session_duration
,      (select LISTAGG(psn.first_name||' '||psn.last_name, ',') WITHIN GROUP (ORDER BY last_name) AS speakers
        from bth_people psn join bth_speakers skr on (skr.psn_id= psn.id) 
        where skr.ssn_id = ssn.id
       ) speakers
from   bth_planning_items pim
       join
       bth_rooms rom
       on (pim.rom_id = rom.id)
       join
       bth_slots slt
       on (pim.slt_id = slt.id)
       left outer join
       bth_sessions ssn
       on (pim.ssn_id = ssn.id)
where  slt.display_label like 'Round%'       
and    slt.start_time < to_date('03-06-2016','DD-MM-YYYY') 
)
PIVOT (max(planning_t( null, null, null, null, null, null, null, null, session_title
  , speakers)) as pim 
  for (room) in ('Room 1' as Room1, 'Room 2' as Room2,'Room 3' as Room3,'Room 4' as Room4,'Room 5' as Room5,'Room 6' as Room6,'Room 7' as Room7,'Room 8' as Room8))
order
by     start_time



-- get all sessions in pivot format - with a planning_t package per planned session

select sch.*
, (select planning_t( pim.id, ssn.title
          , (select LISTAGG(psn.first_name||' '||psn.last_name, ',') WITHIN GROUP (ORDER BY last_name) AS speakers
             from bth_people psn join bth_speakers skr on (skr.psn_id= psn.id) 
             where skr.ssn_id = ssn.id
            )
            , pim.slt_id
         ) 
  from   bth_planning_items pim
       join
       bth_rooms rom
       on (pim.rom_id = rom.id)
       join
       bth_slots slt
       on (pim.slt_id = slt.id)
       left outer join
       bth_sessions ssn
       on (pim.ssn_id = ssn.id)
  where pim.id = sch.room1_pim
  ) as room1_p
from (
select rom.display_label room
,      slt.display_label slot
,      slt.start_time
,      pim.id
from   bth_planning_items pim
       join
       bth_rooms rom
       on (pim.rom_id = rom.id)
       join
       bth_slots slt
       on (pim.slt_id = slt.id)
where  slt.display_label like 'Round%'       
and    slt.start_time < to_date('03-06-2016','DD-MM-YYYY') 
)
PIVOT (max(id) as pim 
  for (room) in ('Room 1' as Room1, 'Room 2' as Room2,'Room 3' as Room3,'Room 4' as Room4,'Room 5' as Room5,'Room 6' as Room6,'Room 7' as Room7,'Room 8' as Room8)
) sch
order
by     start_time



-- select schedule using get_planning_item function to get single planning_t for a  slot (maybe not super performance but pretty convenien)
select sch.slot
,      sch.start_time
, bth_planning_api.get_planning_item( p_pim_id => sch.room1_pim) as room1_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room2_pim) as room2_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room3_pim) as room3_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room4_pim) as room4_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room5_pim) as room5_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room6_pim) as room6_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room7_pim) as room7_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room8_pim) as room8_pim
from (
select rom.display_label room
,      slt.display_label slot
,      slt.start_time
,      pim.id
from   bth_planning_items pim
       join
       bth_rooms rom
       on (pim.rom_id = rom.id)
       join
       bth_slots slt
       on (pim.slt_id = slt.id)
where  slt.display_label like 'Round%'       
and    slt.start_time < to_date('03-06-2016','DD-MM-YYYY') 
)
PIVOT (max(id) as pim 
  for (room) in ('Room 1' as Room1, 'Room 2' as Room2,'Room 3' as Room3,'Room 4' as Room4,'Room 5' as Room5,'Room 6' as Room6,'Room 7' as Room7,'Room 8' as Room8)
) sch
order
by     start_time


create or replace 
view planning_schedule
as
select sch.slot
,      sch.start_time
, bth_planning_api.get_planning_item( p_pim_id => sch.room1_pim) as room1_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room2_pim) as room2_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room3_pim) as room3_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room4_pim) as room4_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room5_pim) as room5_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room6_pim) as room6_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room7_pim) as room7_pim
, bth_planning_api.get_planning_item( p_pim_id => sch.room8_pim) as room8_pim
from (
select rom.display_label room
,      slt.display_label slot
,      slt.start_time
,      pim.id
from   bth_planning_items pim
       join
       bth_rooms rom
       on (pim.rom_id = rom.id)
       join
       bth_slots slt
       on (pim.slt_id = slt.id)
where  slt.display_label like 'Round%'       
)
PIVOT (max(id) as pim 
  for (room) in ('Room 1' as Room1, 'Room 2' as Room2,'Room 3' as Room3,'Room 4' as Room4,'Room 5' as Room5,'Room 6' as Room6,'Room 7' as Room7,'Room 8' as Room8)
) sch
order
by     start_time

select * from planning_schedule
/



select count(*) 
,      duration
from   bth_sessions ssn
where lower(status) like 'acc%'
group
by     ssn.duration


select initcap(status)  status
,      title
,      psn.first_name || ' '||psn.last_name speaker
from   bth_sessions ssn
       join
       bth_speakers skr
       on (skr.ssn_id = ssn.id)
       join 
       bth_people psn
       on (skr.psn_id = psn.id)
