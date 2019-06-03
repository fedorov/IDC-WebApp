#!/usr/bin/env bash

# Copyright 2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# if [ -d ${JUPYTER_HOME} ]; then
#    exit 0
# fi

echo "Setting up Jupyter"

GCLOUD_BUCKET=elee-notebook-vm
echo "Copy setEnvVars.sh ..."
gsutil cp gs://${GCLOUD_BUCKET}/setEnvVars.sh .
echo "Copy passhash.txt"
gsutil cp gs://${GCLOUD_BUCKET}/passhash.txt .
echo "Copy ssl certSubj.txt"
gsutil cp gs://${GCLOUD_BUCKET}/certSubj.txt .
source ./setEnvVars.sh
echo "Add user"
useradd -m ${USER_NAME}
echo "log in as user"
sudo -u ${USER_NAME} bash <<END_OF_BASH
cd ~
#
# Get the idle monitor scripts and idle shutdown script up to the machine:
#
echo "Uploading idle monitor and shutdown scripts"
gsutil cp gs://${GCLOUD_BUCKET}/cpuLogger.sh .
gsutil cp gs://${GCLOUD_BUCKET}/idle_checker.py .
gsutil cp gs://${GCLOUD_BUCKET}/idle_log_wrapper.sh .
gsutil cp gs://${GCLOUD_BUCKET}/idle_shutdown.py .
gsutil cp gs://${GCLOUD_BUCKET}/shutdown_wrapper.sh .
sudo apt-get update
#
# Do not use pip3 to upgrade pip. Does not play well with Debian pip
#
sudo apt-get install -y python3-pip
#
# We want venv support for notebooks:
#
sudo apt-get install -y python3-venv
#
# For idle monitoring, we need tcpdump and multilog
#
sudo apt-get install -y tcpdump
sudo apt-get install -y daemontools
#
# For monitoring, we use pandas:
#
python3 -m pip install pandas
#
# Get jupyter installed:
#
python3 -m pip install jupyter
#
# Was seeing issues on first install (early 2019), these fixed problems. Are they still needed?
#
python3 -m pip install --upgrade --user nbconvert
python3 -m pip install --upgrade --user tornado==5.1.1
#
# Get ready for certs:
#
echo 'mkdir .jupyter'
cd ~
mkdir .jupyter
#
# Generate self-signed cert on the VM:
#
echo 'generate self-signed cert'
#CERT_SUBJ=`cat certSubj.txt`
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -subj "$(cat certSubj.txt)" -keyout ~/.jupyter/mykey.key -out ~/.jupyter/mycert.pem
sudo rm /certSubj.txt

#
# Get the password from the file we created on the desktop:
#
# cd ~
# PASSWD=`cat passhash.txt`
#
#
# Get config set up for remote access:
#
~/.local/bin/jupyter notebook --generate-config
cat >> ~/.jupyter/jupyter_notebook_config.py <<END_OF_CONFIG
c = get_config()
c.NotebookApp.ip = '*'
c.NotebookApp.open_browser = False
c.NotebookApp.port = ${SERV_PORT}
c.NotebookApp.allow_origin = '*'
c.NotebookApp.allow_remote_access = True
c.NotebookApp.certfile = u"/home/${USER_NAME}/.jupyter/mycert.pem"
c.NotebookApp.keyfile = u"/home/${USER_NAME}/.jupyter/mykey.key"
c.NotebookApp.password = u"$(cat passhash.txt)"
END_OF_CONFIG
sudo rm /passhash.txt
#
# Build directories, move scripts into place:
#
mkdir ~/log
mkdir ~/bin
mkdir ~/idlelogs

chmod u+x cpuLogger.sh
chmod u+x idle_log_wrapper.sh
chmod u+x shutdown_wrapper.sh
mv ~/cpuLogger.sh ~/bin/.
mv ~/idle_checker.py ~/bin/.
mv ~/idle_log_wrapper.sh ~/bin/.
mv ~/idle_shutdown.py ~/bin/.
mv ~/shutdown_wrapper.sh ~/bin/.
sudo mv /setEnvVars.sh ~/bin/.

#
# Supervisor. Apparently, the apt-get gets us the system init.d install, while we
# need to do the pip upgrade to get ourselves to 3.3.1:
#
sudo apt-get install -y supervisor
sudo python3 -m pip install --upgrade supervisor

# Daemon to run notebook server
cat >> ~/notebook.conf <<END_OF_SUPER
[program:notebooks]
directory=/home/${USER_NAME}
command=/home/${USER_NAME}/.local/bin/jupyter notebook
autostart=true
autorestart=true
user=${USER_NAME}
stopasgroup=true
stderr_logfile=/home/${USER_NAME}/log/notebook-err.logs
stdout_logfile=/home/${USER_NAME}/log/notebook-out.log
END_OF_SUPER

# Daemon to log VM activity stats

cat >> ~/idlelog.conf <<END_OF_SUPER_IDLELOG
[program:idlelog]
directory=/home/${USER_NAME}
command=/home/${USER_NAME}/bin/idle_log_wrapper.sh
autostart=true
autorestart=true
user=${USER_NAME}
stopasgroup=true
stderr_logfile=/home/${USER_NAME}/log/idlelog-err.log
stdout_logfile=/home/${USER_NAME}/log/idlelog-out.log
END_OF_SUPER_IDLELOG

# Daemon to shutdown idle machine

cat >> ~/idleshut.conf <<END_OF_SUPER_SHUTDOWN
[program:idleshut]
directory=/home/${USER_NAME}
command=/home/${USER_NAME}/bin/shutdown_wrapper.sh
autostart=true
autorestart=true
user=${USER_NAME}
stopasgroup=true
stderr_logfile=/home/${USER_NAME}/log/shutdownlog-err.log
stdout_logfile=/home/${USER_NAME}/log/shutdownlog-out.log
END_OF_SUPER_SHUTDOWN

#
# Supervisor config files:
#

sudo mv ~/notebook.conf /etc/supervisor/conf.d/
sudo mv ~/idlelog.conf /etc/supervisor/conf.d/
sudo mv ~/idleshut.conf /etc/supervisor/conf.d/
END_OF_BASH

#
# Get the virtual environment installed:
#
cd /home/${USER_NAME}
for i in $(seq 1 5)
do
  python3 -m venv virtualEnv${i}
  source virtualEnv${i}/bin/activate
  pip install ipykernel
  python -m ipykernel install --user --name=virtualEnv${i}
  deactivate
done
sudo -u ${USER_NAME} bash <<EOM
cd ~
sudo supervisorctl reread
sudo supervisorctl update
EOM