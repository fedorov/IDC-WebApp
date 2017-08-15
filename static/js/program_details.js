/**
 *
 * Copyright 2017, Institute for Systems Biology
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        base: 'base',
        text: 'libs/require-text',
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'underscore': {exports: '_'},
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'base'
], function($, jqueryui, bootstrap, session_security, _, base) {
    'use strict';

    //
    // We always want to reset forms when we hide modals, since otherwise even on a successful AJAX
    // submission and reload Chrome asks us if we want to do the reload!
    //

    $('.modal').on('hide.bs.modal', function() {
        var forms = $(this).find('form');
        if (forms.length) {
            _.each(forms, function (form) {
                form.reset();
            });
        }
      })

    //
    // This handles issue #2006. When user edits name or description, we check that there are no
    // unallowed characters. Also used in the project editor dialog.
    //

    var do_submission = function(self, e, name_class, desc_class, msg_class) {
        e.preventDefault();
        e.stopPropagation();
        var $self = $(self);

        // showJsMessage wants either the ID or DOM element. This gives the DOM element:
        var msg_target = $self.siblings(msg_class)[0];

        var name = $self.find(name_class).val();
        var desc = $self.find(desc_class).val();

        var unallowed_name = name.match(base.whitelist);
        var unallowed_desc = desc.match(base.whitelist);

        if (unallowed_name || unallowed_desc) {
            var unallowed_all = "";
            if (unallowed_name) {
                unallowed_all += unallowed_name.join(", ");
            }
            if (unallowed_name && unallowed_desc) {
                unallowed_all += ", ";
            }
            if (unallowed_desc) {
                unallowed_all += unallowed_desc.join(", ");
            }
            base.showJsMessage('danger',
                "These characters are invalid: " + unallowed_all, true, msg_target);
            return false;
        } else {
            $(msg_target).empty();
        }

        $self.find('.btn-primary').addClass('btn-disabled').attr('disabled', true);

        var csrftoken = $.getCookie('csrftoken');
        $.ajax({
            type        :'POST',
            url         : $self.attr('action'),
            dataType    :'json',
            data        : $self.serialize(),
            beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success : function (data) {
                if(data.status && data.status == 'error') {
                    if(data.result && data.result.msg) {
                        base.showJsMessage('error', data.result.msg, true, msg_target);
                    }
                } else if(data.status && data.status == 'success') {
                    if(data.result && data.result.msg) {
                        base.setReloadMsg('info',data.result.msg);
                    }
                    $self.closest('.modal').modal('hide');
                    if($self.data('redirect')) {
                        window.location = $self.data('redirect');
                    } else {
                        window.location.reload();
                    }
                }
            },
            error: function (err) {
                $self.closest('.modal').modal('hide');
                base.showJsMessage('error',err,true);
            },
        }).always(function () {
            $self.find('.btn-primary').removeClass('btn-disabled').attr('disabled', false);
        });
        // We don't want this form submission to automatically trigger a reload
        return false;
    }

    // Handles program edits checking and submission
    $('#edit-program').on('submit', function(e) {
         return (do_submission(this, e, '.edit-name-field', '.edit-desc-field', '.modal-js-messages'));
      })

    // Handles project edits checking and submission
    $('.project-edit-form').on('submit', function(e) {
         return (do_submission(this, e, '.edit-name-field', '.edit-desc-field', '.modal-js-messages'));
      })

});