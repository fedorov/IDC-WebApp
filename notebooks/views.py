"""
Copyright 2019, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

import re
import logging
import json
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse, JsonResponse
from .models import Notebook, Notebook_Added, Instance
from .notebook_vm import start_vm, stop_vm, delete_vm, check_vm_stat, get_vm_external_ip
from pprint import pprint



logger = logging.getLogger('main_logger')

debug = settings.DEBUG
BLACKLIST_RE = settings.BLACKLIST_RE
SOLR_URL = settings.SOLR_URL


# SETUP_FIREWALL = 0
# SETUP_EXTERNAL_IP = 1
# SETUP_MONITOR = 2
# SETUP_INSTANCE = 3


# NOTEBOOK_ENV_FILE_LOC = settings.NOTEBOOK_ENV_LOC
# NOTEBOOK_SL_PATH = settings.NOTEBOOK_SL_PATH
@login_required
def notebook_list(request):
    template = 'notebooks/notebook_list.html'
    command = request.path.rsplit('/', 1)[1]
    notebooks = None
    is_public_list = (command == "public")

    if is_public_list:
        if request.method == "POST":
            notebook_keywords = request.POST.get('nb-keywords')[0:2000]
            # print(notebook_keywords)
            if notebook_keywords:
                result_ids = [4, 7]
                notebooks = Notebook.objects.filter(is_public=True, active=True, pk__in=result_ids)

                # solr_nb_search_url = SOLR_URL+'notebooks/select?wt=json&q='+notebook_keywords
                # try:
                #     r = requests.post(solr_nb_search_url)
                #     # connection = urlopen('https://google.com')
                #     # connection = urlopen(solr_nb_search_url)
                #     # connection = url_open(solr_nb_search_url)
                #
                # except Exception as e:
                #     logger.error("[ERROR] Exception when viewing a notebook: ")
                #     logger.exception(e)
                #     messages.error(request, "An error was encountered while trying to view this notebook.")
                # finally:
                #     redirect_url = reverse('notebooks_public')
                #     return redirect(redirect_url)

                # response = json.load(connection)
                # print (response['response']['numFound'], "documents found.")

                # Print the name of each document.

                # for document in response['response']['docs']:
                #     print "  Name =", document['name']
        # sharedNotebooks = Notebook.objects.filter(shared__matched_user=request.user, shared__active=True,
        #                                           active=True)
        if not notebooks:
            notebooks = Notebook.objects.filter(is_public=True, active=True)
    else:
        user_notebooks = request.user.notebook_set.filter(active=True)
        added_public_notebook_ids = Notebook_Added.objects.filter(user=request.user).values_list('notebook', flat=True)
        shared_notebooks = Notebook.objects.filter(is_public=True, active=True, pk__in=added_public_notebook_ids)
        notebooks = user_notebooks | shared_notebooks
        notebooks = notebooks.distinct()

    return render(request, template, {'is_public_list': is_public_list, 'notebooks': notebooks})


@login_required
def notebook(request, notebook_id=0):
    template = 'notebooks/notebook.html'
    command = request.path.rsplit('/', 1)[1]
    notebook_model = None
    try:
        if request.method == "POST":
            if command == "create":
                notebook_model = Notebook.createDefault(name="Untitled Notebook", description="", user=request.user)
            elif command == "edit":
                # Truncate incoming name and desc fields in case someone tried to send ones which were too long
                notebook_name = request.POST.get('name')[0:2000]
                notebook_keywords = request.POST.get('keywords')[0:2000]
                notebook_desc = request.POST.get('description')[0:2000]
                notebook_file_path = request.POST.get('file_path')[0:2000]
                blacklist = re.compile(BLACKLIST_RE, re.UNICODE)
                match_name = blacklist.search(str(notebook_name))
                match_keywords = blacklist.search(str(notebook_keywords))
                match_desc = blacklist.search(str(notebook_desc))

                if match_name or match_desc or match_keywords:
                    # XSS risk, log and fail this cohort save
                    match_list = []
                    field_names = ""

                    if match_name:
                        match_list.append('name')
                    if match_desc:
                        match_list.append('description')
                    if match_keywords:
                        match_list.append('keywords field')
                    match_list_len = len(match_list)
                    for i in range(match_list_len):
                        field_names += (
                            '' if i == 0 else (' and ' if i == (match_list_len - 1) else ', ') + match_list[i])
                    err_msg = "Your notebook's %s contain%s invalid characters; please revise your inputs" % (
                        field_names, ('s' if match_list_len < 2 else ''))
                    messages.error(request, err_msg)
                    redirect_url = reverse('notebook_detail', kwargs={'notebook_id': notebook_id})
                    return redirect(redirect_url)

                notebook_model = Notebook.edit(id=notebook_id, name=notebook_name, keywords=notebook_keywords,
                                               description=notebook_desc, file_path=notebook_file_path)
            elif command == "copy":
                notebook_model = Notebook.copy(id=notebook_id, user=request.user)
            elif command == "delete":
                Notebook.destroy(id=notebook_id)
            elif command == "add":
                notebook_model = Notebook.objects.get(id=notebook_id)
                if not notebook_model.is_public:
                    messages.error(request,
                                   'Notebook <b>{}</b> is a privately listed notebook - Unable to add this notebook to your list.'.format(
                                       notebook_model.name))
                elif notebook_model.isin_notebooklist(user=request.user):
                    messages.error(request,
                                   'Notebook <b>{}</b> is already in your notebook list.'.format(
                                       notebook_model.name))
                else:
                    Notebook.add(id=notebook_id, user=request.user)
                    messages.info(request, 'Notebook <b>{}</b> is added to your notebook list.'.format(
                        notebook_model.name))
            elif command == "remove":
                notebook_model = Notebook.objects.get(id=notebook_id)
                nb_name = notebook_model.name
                Notebook.remove(id=notebook_id, user=request.user)
                messages.info(request, 'Notebook <b>{}</b> is removed from your notebook list.'.format(
                    nb_name))

            if command == "delete" or command == "remove":
                redirect_url = reverse('notebooks')
            else:
                redirect_url = reverse('notebook_detail', kwargs={'notebook_id': notebook_model.id})

            return redirect(redirect_url)

        elif request.method == "GET":
            redirect_view = 'notebooks' + ('_public' if command == "public" else '')
            if notebook_id:
                try:
                    if command == "public":
                        notebooks = Notebook.objects.filter(is_public=True, active=True)
                    else:
                        user_notebooks = request.user.notebook_set.filter(active=True)
                        added_public_notebook_ids = Notebook_Added.objects.filter(user=request.user).values_list(
                            'notebook', flat=True)
                        shared_notebooks = Notebook.objects.filter(is_public=True, active=True,
                                                                   pk__in=added_public_notebook_ids)
                        notebooks = user_notebooks | shared_notebooks
                        notebooks = notebooks.distinct()

                    notebook_model = notebooks.get(id=notebook_id)

                    notebook_vm_running = True
                    notebook_vm_ip = '35.193.231.158'
                    notebook_vm_jp_port = 5000
                    notebook_viewer = 'https://{ip_address}:{port}/tree/virtualEnv1'.format(ip_address=notebook_vm_ip,
                                                                                    port=notebook_vm_jp_port) if notebook_vm_running else settings.NOTEBOOK_VIEWER+'/github/'
                    notebook_file_path = 'Community-Notebooks/RegulomeExplorer/RegulomeExplorer_2.1.ipynb' if notebook_vm_running else notebook_model.file_path
                    # notebook_file_path = (notebook_model.file_path).split('/')[-1] if notebook_vm_running else notebook_model.file_path
                    return render(request, template,
                                  {'notebook': notebook_model, 'from_public_list': command == "public",
                                   'notebook_viewer': notebook_viewer, 'file_path': notebook_file_path})
                except ObjectDoesNotExist:
                    redirect_url = reverse(redirect_view)
                    return redirect(redirect_url)
            else:
                redirect_url = reverse(redirect_view)
                return redirect(redirect_url)

    except Exception as e:
        logger.error("[ERROR] Exception when viewing a notebook: ")
        logger.exception(e)
        messages.error(request, "An error was encountered while trying to view this notebook.")
    finally:
        redirect_url = reverse('notebooks')

    return redirect(redirect_url)


# def validate_env_vars:
# @login_required
# def notebook_vm_command(request):
#     command = request.path.rsplit('/', 1)[1]
#     message = ''
#     template = 'notebooks/notebook_vm.html'
#     # print('ip address: {}'.format(get_client_ip(request)))
#     if command == 'start_vm':
#         SETUP_FILES = 5
#         # SETUP_INSTANCE = 3
#         DELETE_FIREWALL = 6
#         DELETE_ADDRESS = 7
#         SETUP_MONITOR = 2
#         STOP_INSTANCE = 9
#         DELETE_INSTANCE = 10
#         # client_ip = get_client_ip(request)
#         result = start_vm()
#     elif command == 'stop_vm':
#         result = stop_vm()
#     elif command == 'delete_vm':
#         result = delete_vm()
#     # elif command  == 'check_vm':
#     #     result = check_vm_stat()
#         # result = start_n_launch(client_ip=client_ip)
#     return render(request, template, result)

@login_required
def notebook_vm_command(request):
    body_unicode = request.body.decode('utf-8')
    body = json.loads(body_unicode)
    vm_user = body['user']
    project_id = body['project_id']
    vm_name = body['name']
    zone = body['zone']
    password = body['password']
    firewall_ip_range = body['client_ip_range'].replace(' ','').split(',') # remove white spaces and place them in list
    serv_port = body['serv_port']
    region = '-'.join(zone.split('-')[:-1])
    address_name = vm_user + '-jupyter-address'
    firewall_rule_name = vm_user + '-jupyter-firewall-rule'
    topic_name = vm_user + "-notebooks-management"

    command = request.path.rsplit('/', 1)[1]
    if command == 'create_vm':
        result = start_vm(project_id, zone, vm_user, vm_name, firewall_rule_name, firewall_ip_range, serv_port, region, address_name, password, topic_name)
        # pprint(result)
        if result['resp_code'] == 200:
            vm_instances = Instance.objects.filter(name=vm_name, vm_username=vm_user, zone=zone)
            if not vm_instances:
                Instance.create(name=vm_name,
                                    user=request.user,
                                    vm_username=vm_user,
                                    project_id=project_id,
                                    zone=zone)
                print('instance object is created')
    elif command == 'start_vm':
        result= start_vm(project_id, zone, vm_user, vm_name, firewall_rule_name, firewall_ip_range, serv_port, region, address_name, password)
    elif command == 'stop_vm':
        result = stop_vm(project_id, zone, vm_name)
    elif command == 'delete_vm':
        result = delete_vm(project_id, zone, vm_name, firewall_rule_name, region, address_name, topic_name)
        if result['resp_code'] == 200:
            Instance.delete(name=vm_name,
                                user=request.user,
                                vm_username=vm_user,
                                project_id=project_id,
                                zone=zone)
    elif command == 'check_vm':
        result = check_vm_stat(project_id, zone, vm_name)
    elif command == 'run_browser':
        result = get_vm_external_ip(project_id, region, address_name)
    return JsonResponse(result)


# @login_required
# def get_client_ip(request):
#     x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
#     # print('x_forwarded_for: ' + str(x_forwarded_for))
#     if x_forwarded_for:
#         ip = x_forwarded_for.split(',')[0]
#     else:
#         ip = request.META.get('REMOTE_ADDR')
#     return ip

# @login_required
# def create_vm_model(name, user, project_id, zone):
#     Instance.create(name=name,
#                                user=user,
#                                gcp=project_id,
#                                zone=zone,
#                                active=1)
#
#     # redirect_url = reverse('workbook_detail', kwargs={'workbook_id': workbook_model.id})
#     return redirect('dashboard')