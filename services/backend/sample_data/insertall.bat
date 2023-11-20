@echo off

mongosh mongodb+srv://ict3x03:ict3x03webapp@ict3x03-cluster.nxsz8td.mongodb.net/ict3x03 --eval "db.users.drop()"
mongosh mongodb+srv://ict3x03:ict3x03webapp@ict3x03-cluster.nxsz8td.mongodb.net/ict3x03 --eval "db.bankaccounts.drop()"
mongosh mongodb+srv://ict3x03:ict3x03webapp@ict3x03-cluster.nxsz8td.mongodb.net/ict3x03 --eval "db.transactions.drop()"

mongoimport --uri mongodb+srv://ict3x03:ict3x03webapp@ict3x03-cluster.nxsz8td.mongodb.net/ict3x03 -c users --jsonArray --file sample_users.json
mongoimport --uri mongodb+srv://ict3x03:ict3x03webapp@ict3x03-cluster.nxsz8td.mongodb.net/ict3x03 -c bankaccounts --jsonArray --file sample_bankaccounts.json
mongoimport --uri mongodb+srv://ict3x03:ict3x03webapp@ict3x03-cluster.nxsz8td.mongodb.net/ict3x03 -c transactions --jsonArray --file sample_transactions.json

pause