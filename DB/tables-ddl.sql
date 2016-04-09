create table bth_sessions
( id number(10) not null primary key
, title varchar2(1000) not null
, abstract clob
, 


create table bth_people
( id number(10) not null primary key
, first_name
, last_name
, company
, country
, email_address
, mobile_phone_number
, birthdate
, gender
, twitter_handle
, linkedin_profile
, facebook_account 
, picture blob
, biography clob
);

create table bth_speakers
( id number(10) not null primary key
, ssn_id number(10) not null
, psn_id number(10) not null
, contribution varchar2(500)
);