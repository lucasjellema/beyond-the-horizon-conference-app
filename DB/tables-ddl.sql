
create sequence bth_seq;

drop table bth_sessions;


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