
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
);


create table bth_people
( id number(10) default bth_seq.nextval not null primary key
, first_name  varchar2(500)
, last_name  varchar2(500)
, company  varchar2(500)
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


delete from bth_people where id in (select id from (select id, 
 first_name  
, last_name 
, company  
, rank() over (partition by first_name, last_name order by id) rnk
from bth_people
)
where rnk = 2
)

insert into bth_sessions
( title 
, abstract 
, target_audience 
, experience_level
, granularity 
, duration  -- 2, 1, 0.5 for MC, regular and quickie
) select
rs.PROPOSALTITLE
, rs.SESSIONABSTRACT
, rs.TARGETAUDIENCE
, rs.EXPERIENCELEVEL
, rs.GRANULARITY_LEVEL
, case duration when 'Normal length (45 min)' then 1 when 'Quickie (20 min)' then 0.5 when 'Extended (masterclass) (1h 30 min)' then 2 else 0 end
from raw_sessions rs


insert into bth_speakers
( ssn_id 
, psn_id 
, contribution 
)
select s.id 
,     p.id
, 'main'
from raw_sessions rs
join
bth_people p
on (p.first_name = rs.voornaam and p.last_name = rs.achternaam)
join 
bth_sessions s
on (rs.PROPOSALTITLE = s.title)


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
  for r_tags in ( select tags from raw_sessions) loop
     l_tags:= l_tags  MULTISET UNION DISTINCT bth_util.get_tokens(r_tags.tags);
  end loop;
 insert into bth_tags
 (display_label, tcy_id)
 select distinct ltrim(content_tag), 161 
 from 
 ( select trim(column_value) content_tag 
   from   table(l_tags) 
 ); 
end;  

declare 
  l_tags string_tbl_t ;
begin
  for r_tags in ( select rs.tags, ssn.id ssn_id from raw_sessions rs join
            bth_sessions ssn
            on (ssn.title = rs.PROPOSALTITLE)
            ) loop
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
from   raw_sessions rs
       join
       bth_sessions ssn
       on (ssn.title = rs.PROPOSALTITLE)
       join
       bth_tags tag
       on ( instr(lower(rs.duration) , lower(case tag.display_label when 'Regular' then 'Normal' else tag.display_label end  ) )>0 and tag.tcy_id = 164)
       
       
       

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
from   raw_sessions rs
       join
       bth_sessions ssn
       on (ssn.title = rs.PROPOSALTITLE)
       join
       bth_tags tag
       on (rs.experiencelevel = tag.display_label and tag.tcy_id = 165)
       
       
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
