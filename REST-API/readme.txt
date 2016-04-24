node oracledb does not support types and nested tables (collections)
I resorted to a structured data record in a JSON string
JSON does not fit in varchar2, so I use with CLOB
CLOB handling from node-oracledb is supposed to work, but failed on ACC (after first chunk, processing stopped)
I then resorted to index by tables (associative arrays): breaking up the JSON CLOB in lines of 2000 characters, returned as an index by tables
This too failed: ORA-06502: PL/SQL: numeric or value error: host bind array too small

I finally decided to go with a nested table (with the lines of text from the JSON string) returned from the PL/SQL API, and a select statement in the Node.js application using the TABLE operator against the nested table 