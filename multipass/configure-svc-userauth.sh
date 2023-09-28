### Create the database for the UserAuthentication service

sudo mysql --user=root <<EOF
CREATE DATABASE userauth;
CREATE USER 'userauth'@'localhost' IDENTIFIED BY 'userauth';
GRANT ALL PRIVILEGES ON userauth.* TO 'userauth'@'localhost' WITH GRANT OPTION;
EOF

## Set up the UserAuthentication service code

sudo mkdir -p /opt/userauth
sudo chmod 777 /opt/userauth
(cd /build-users; tar cf - .) | (cd /opt/userauth; tar xf -)
(
    cd /opt/userauth
    rm -rf node-modules package-lock.json users-sequelize.sqlite3
    rm yarn.lock
    npm install
)
