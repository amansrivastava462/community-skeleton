(function ($) {
    // Wait for all assets to load
    $(window).bind("load", function() {
        var UVDeskCommunityInstallSetupView = Backbone.View.extend({
            el: '#wizardContent',
            wizard: undefined,
            installation_setup_template: _.template($("#installationWizard-InstallSetupTemplate").html()),
            installation_process_template: _.template($("#installationWizard-InstallSetupTemplate-ProcessingItem").html()),
            installation_successfull_template: _.template($('#installationWizard-InstallationCompleteTemplate').html()),
            events: {
                'click #wizardCTA-CancelInstallation': 'abortInstallation',
                'click #wizardCTA-StartInstallation': 'installHelpdesk',
            },
            initialize: function(params) {
                this.wizard = params.wizard;
                this.wizard.reference_nodes.content.html(this.installation_setup_template());
            },
            installHelpdesk: function(params) {
                this.updateConfigurations();
            },
            updateConfigurations: function() {
                let self = this;
                let promise = new Promise(function(resolve, reject) {
                    $.post('/setup/xhr/load/configurations', function (response) {
                        resolve(response);
                    }).fail(function(response) {
                        reject(response);
                    });
                });

                this.$el.find('#wizard-finalizeInstall').html(this.installation_process_template({ currentStep: 'load-configurations' }));
                this.$el.find('#wizard-finalizeInstall .installation-progress-loader').html(this.wizard.wizard_icons_loader_template());
                
                promise.then(function(response) {
                    self.loadMigrations();
                });
            },
            loadMigrations: function() {
                let self = this;
                let promise = new Promise(function(resolve, reject) {
                    $.post('/setup/xhr/load/migrations', function (response) {
                        resolve(response);
                    }).fail(function(response) {
                        reject(response);
                    });
                });

                this.$el.find('#wizard-finalizeInstall').html(this.installation_process_template({ currentStep: 'load-migrations' }));
                this.$el.find('#wizard-finalizeInstall .installation-progress-loader').html(this.wizard.wizard_icons_loader_template());

                promise.then(function(response) {
                    self.populateDatasets();
                });
            },
            populateDatasets: function() {
                let self = this;
                let promise = new Promise(function(resolve, reject) {
                    $.post('/setup/xhr/load/entities', function (response) {
                        resolve(response);
                    }).fail(function(response) {
                        reject(response);
                    });
                });

                this.$el.find('#wizard-finalizeInstall').html(this.installation_process_template({ currentStep: 'populate-datasets' }));
                this.$el.find('#wizard-finalizeInstall .installation-progress-loader').html(this.wizard.wizard_icons_loader_template());

                promise.then(function(response) {
                    self.createDefaultSuperUser();
                });
            },
            createDefaultSuperUser: function() {
                let self = this;
                let promise = new Promise(function(resolve, reject) {
                    $.post('/setup/xhr/load/super-user', function (response) {
                        resolve(response);
                    }).fail(function(response) {
                        reject(response);
                    });
                });

                this.$el.find('#wizard-finalizeInstall').html(this.installation_process_template({ currentStep: 'create-super-user' }));
                this.$el.find('#wizard-finalizeInstall .installation-progress-loader').html(this.wizard.wizard_icons_loader_template());

                promise.then(function(response) {
                    self.redirectToWelcomePage();
                });
            },
            redirectToWelcomePage: function() {
                this.$el.html(this.installation_successfull_template());
            }
        });

        var UVDeskCommunityAccountConfigurationModel = Backbone.Model.extend({
            view: undefined,
            defaults: {
                user: {
                    name: null,
                    email: null,
                    password: null,
                    confirmPassword: null,
                }
            },
            initialize: function (attributes) {
                this.view = attributes.view;
            },
            isProcedureCompleted: function (callback) {
                this.set('user', {
                    name: this.view.$el.find('input[name="name"]').val(),
                    email: this.view.$el.find('input[name="email"]').val(),
                    password: this.view.$el.find('input[name="password"]').val(),
                });

                let wizard = this.view.wizard;
                wizard.reference_nodes.content.find('#wizardCTA-IterateInstallation').prepend('<span class="processing-request">' + wizard.wizard_icons_loader_template() + '</span>');
                
                $.post('/setup/xhr/intermediary/super-user', this.get('user'), function (response) {
                    if (typeof response.status != 'undefined' && true === response.status) {
                        callback(wizard);
                    } else {
                        wizard.disableNextStep();
                    }
                }).fail(function(response) {
                    wizard.disableNextStep();
                }).always(function() {
                    wizard.reference_nodes.content.find('#wizardCTA-IterateInstallation .processing-request').remove();
                });
            },
        });

        var UVDeskCommunityAccountConfigurationView = Backbone.View.extend({
            el: '#wizardSetup',
            model: UVDeskCommunityAccountConfigurationModel,
            wizard: undefined,
            account_settings_template: _.template($("#installationWizard-AccountConfigurationTemplate").html()),
            events: {
                "keyup .form-content input" : "validateForm",
            },
            initialize: function(params) {
                let self = this;
                Backbone.Validation.bind(self);
                
                this.wizard = params.wizard;
                this.model = new UVDeskCommunityAccountConfigurationModel({ view: self });               
                this.$el.html(this.account_settings_template(this.model.attributes));
            },
            validateForm: _.debounce(function(e) {
                let errorFlag = false;
                let emailRegEX = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;

                let user = {
                    name: this.$el.find('input[name="name"]').val(),
                    email: this.$el.find('input[name="email"]').val(),
                    password: this.$el.find('input[name="password"]').val(),
                    confirmPassword: this.$el.find('input[name="confirm_password"]').val(),
                };

                this.$el.find('.form-content .wizard-form-notice').remove();

                if (user.name == null || user.name =="") {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="name"]').after("<span class='wizard-form-notice'>This field is mandatory</span>")
                }

                if (user.email == null || user.email =="") {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="email"]').after("<span class='wizard-form-notice'>This field is mandatory</span>")
                }

                if (user.password == null || user.password =="") {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="password"]').after("<span class='wizard-form-notice'>This field is mandatory</span>")
                }

                if (user.confirmPassword == null || user.confirmPassword =="") {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="confirm_password"]').after("<span class='wizard-form-notice'>This field is mandatory</span>")
                }

                if (!emailRegEX.test(user.email)) {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="email"]').after("<span class='wizard-form-notice'>Invalid Email</span>")
                }

                if (user.confirmPassword != user.password) {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="confirm_password"]').after("<span class='wizard-form-notice'>This Password does not matched </span>")
                }
                
                if (false == errorFlag) {
                    this.wizard.enableNextStep();
                } else {
                    this.wizard.disableNextStep();
                }
            }, 400),
        });
    
        var UVDeskCommunityDatabaseConfigurationModel = Backbone.Model.extend({
            view: undefined,
            defaults: {
                verified: false,
                credentials: {
                    hostname: 'localhost',
                    username: 'root',
                    password: null,
                    database: null,
                }
            },
            initialize: function (attributes) {
                this.view = attributes.view;
            },
            isProcedureCompleted: function (callback) {
                this.set('credentials', {
                    hostname: this.view.$el.find('input[name="hostname"]').val(),
                    username: this.view.$el.find('input[name="username"]').val(),
                    password: this.view.$el.find('input[name="password"]').val(),
                    database: this.view.$el.find('input[name="database"]').val(),
                });

                let wizard = this.view.wizard;
                wizard.reference_nodes.content.find('#wizardCTA-IterateInstallation').prepend('<span class="processing-request">' + wizard.wizard_icons_loader_template() + '</span>');

                $.post('/setup/xhr/verify-database-credentials', this.get('credentials'), function (response) {
                    if (typeof response.status != 'undefined' && true === response.status) {
                        callback(wizard);
                    } else {
                        wizard.disableNextStep();
                    }
                }).fail(function(response) {
                    wizard.disableNextStep();
                }).always(function() {
                    wizard.reference_nodes.content.find('#wizardCTA-IterateInstallation .processing-request').remove();
                });
            },
        });

        var UVDeskCommunityDatabaseConfigurationView = Backbone.View.extend({
            el: '#wizardSetup',
            model: undefined,
            wizard: undefined,
            database_configuration_template: _.template($("#installationWizard-DatabaseConfigurationTemplate").html()),
            events: {
                "keyup .form-content input" : "validateForm",
            },
            initialize: function(params) {
                let self = this;

                this.wizard = params.wizard;
                this.model = new UVDeskCommunityDatabaseConfigurationModel({ view: self });

                // Render Database Configuration View
                this.$el.html(this.database_configuration_template(this.model.attributes));
            },
            validateForm: _.debounce(function(e) {
                let errorFlag = false;
                let credentials = {
                    hostname: this.$el.find('input[name="hostname"]').val(),
                    username: this.$el.find('input[name="username"]').val(),
                    password: this.$el.find('input[name="password"]').val(),
                    database: this.$el.find('input[name="database"]').val(),
                };

                this.$el.find('.form-content .wizard-form-notice').remove();

                if (credentials.hostname == null || credentials.hostname == "") {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="hostname"]').parent().append("<span class='wizard-form-notice'>This field is mandatory</span>");
                }
                
                if (credentials.username == null || credentials.username == "") {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="username"]').parent().append("<span class='wizard-form-notice'>This field is mandatory</span>")
                }
                
                if (credentials.password == null || credentials.password == "") {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="password"]').parent().append("<span class='wizard-form-notice'>This field is mandatory</span>")
                }
                
                if (credentials.database == null || credentials.database == "") {
                    errorFlag = true;
                    this.$el.find('.form-content input[name="database"]').parent().append("<span class='wizard-form-notice'>This field is mandatory</span>")
                }

                if (false == errorFlag) {
                    this.wizard.enableNextStep();
                } else {
                    this.wizard.disableNextStep();
                }
            }, 400),
        });

        var UVDeskCommunitySystemRequirementsModel = Backbone.Model.extend({
            view: undefined,
            defaults: {
                fetch: false,
                verified: false,
                'php-version': {
                    status: undefined,
                },
                'php-extensions': {
                    status: undefined,
                },
            },
            initialize: function (attributes) {
                this.view = attributes.view;
            },
            fetch: function() {
                this.set('fetch', true);

                this.checkPHP();
                this.evaluatePHPExtensions();
            },
            isProcedureCompleted: function (callback) {
                if (this.get('verified')) {
                    callback(this.view.wizard);
                }
            },
            checkPHP: function() {
                let self = this;
                let postData = {
                    specification: 'php-version',
                };

                $.post('/setup/xhr/check-requirements', postData, function (response) {
                    self.set('php-version', response);
                }).fail(function(response) {
                    self.set('php-version', {
                        status: false,
                        message: 'An unexpected error occurred during the PHP version verification process.',
                    });
                }).always(function() {
                    self.view.renderPHPVersion();
                    self.evaluateOverallRequirements();
                });
            },
            evaluatePHPExtensions: function() {
                let self = this;
                let postData = {
                    specification: 'php-extensions',
                };

                $.post('/setup/xhr/check-requirements', postData, function (response) {
                    self.set('php-extensions', response);
                }).fail(function() {
                    self.set('php-extensions', {
                        status: false,
                        message: 'An unexpected error occurred while examining your system for missing extensions.',
                    });
                }).always(function() {
                    self.view.renderPHPExtensionsCriteria();
                    self.evaluateOverallRequirements();
                });;
            },
            evaluateOverallRequirements: function() {
                if (false == this.get('php-version').status) {
                    this.set('verified', false);
                } else if (false == this.get('php-extensions').status) {
                    this.set('verified', false);
                } else {
                    this.set('verified', true);
                }

                if (true === this.get('verified')) {
                    this.view.wizard.enableNextStep();
                } else {
                    this.view.wizard.disableNextStep();
                }
            },
        });

        var UVDeskCommunitySystemRequirementsView = Backbone.View.extend({
            el: '#wizardSetup',
            model: undefined,
            wizard: undefined,
            reference_nodes: {
                version: undefined,
                extension: undefined,
            },
            wizard_icons_loader_template: _.template($("#wizardIcons-LoaderTemplate").html()),
            wizard_icons_success_template: _.template($("#wizardIcons-SuccessTemplate").html()),
            wizard_icons_notice_template: _.template($("#wizardIcons-NoticeTemplate").html()),
            wizard_system_requirements_template: _.template($("#installationWizard-SystemRequirementsTemplate").html()),
            wizard_system_requirements_php_ver_template: _.template($("#installationWizard-SystemRequirementsTemplate-PHPVersion").html()),
            wizard_system_requirements_php_ext_template: _.template($("#installationWizard-SystemRequirementsTemplate-PHPExtensions").html()),
            initialize: function(params) {
                let self = this;

                this.wizard = params.wizard;
                this.model = new UVDeskCommunitySystemRequirementsModel({ view: self });

                // Render Initial Template
                this.$el.html(this.wizard_system_requirements_template());

                // Set reference nodes
                this.reference_nodes.version = this.$el.find('#systemCriteria-PHPVersion');
                this.reference_nodes.extension = this.$el.find('#systemCriteria-PHPExtensions');
                
                this.renderPHPVersion('verifying');
                this.renderPHPExtensionsCriteria('verifying');

                this.model.fetch();
            },
            renderPHPVersion: function(status) {
                this.reference_nodes.version.html(this.wizard_system_requirements_php_ver_template(this.model.get('php-version')));

                if (false == this.model.get('fetch')) {
                    this.reference_nodes.version.find('.wizard-svg-icon-criteria-checklist').html(this.wizard_icons_loader_template());
                    this.reference_nodes.version.find('label').html('Checking currently enabled PHP version');
                } else {
                    if (true === this.model.get('php-version').status) {
                        this.reference_nodes.version.find('.wizard-svg-icon-criteria-checklist').html(this.wizard_icons_success_template());
                        this.reference_nodes.version.find('label').html(this.model.get('php-version').message);
                    } else {
                        this.reference_nodes.version.find('.wizard-svg-icon-criteria-checklist').html(this.wizard_icons_notice_template());
                        this.reference_nodes.version.find('label').html(this.model.get('php-version').message);
                    }
                }
            },
            renderPHPExtensionsCriteria: function(status) {
                this.reference_nodes.extension.html(this.wizard_system_requirements_php_ext_template(this.model.get('php-extensions')));

                if (false == this.model.get('fetch')) {
                    this.reference_nodes.extension.find('.wizard-svg-icon-criteria-checklist').html(this.wizard_icons_loader_template());
                    this.reference_nodes.extension.find('label').html('Checking currently enabled PHP extensions');
                } else {
                    if (true === this.model.get('php-version').status) {
                        this.reference_nodes.extension.find('.wizard-svg-icon-criteria-checklist').html(this.wizard_icons_success_template());
                        this.reference_nodes.extension.find('label').html(this.model.get('php-extensions').message);
                    } else {
                        this.reference_nodes.extension.find('.wizard-svg-icon-criteria-checklist').html(this.wizard_icons_notice_template());
                        this.reference_nodes.extension.find('label').html(this.model.get('php-extensions').message);
                    }
                }
            }
        });

        var UVDeskCommunityInstallationWizardView = Backbone.View.extend({
            el: '#wizard',
            router: {},
            enabled: false,
            reference_nodes: {
                header: undefined,
                content: undefined,
            },
            activeSetupProcedure: undefined,
            wizard_icons_success_template: _.template($("#wizardIcons-SuccessTemplate").html()),
            wizard_icons_loader_template: _.template($("#wizardIcons-LoaderTemplate").html()),
            wizard_default_header_template: _.template($("#installationWizard-DefaultHeaderTemplate").html()),
            wizard_default_content_template: _.template($("#installationWizard-DefaultContentTemplate").html()),
            wizard_setup_component_template: _.template($("#installationWizard-SetupTemplate").html()),
            events: {
                'click #wizardCTA-StartInstallation': function() {
                    this.enabled = true;
                    this.reference_nodes.content.empty();
                    this.reference_nodes.content.html(this.wizard_setup_component_template());

                    this.router.navigate('check-requirements', { trigger: true });
                },
                'click #wizardCTA-IterateInstallation': function() {
                    if (typeof(this.activeSetupProcedure) != 'undefined') {
                        this.activeSetupProcedure.model.isProcedureCompleted(function (wizard) {
                            let activeInstanceIndex = undefined;

                            wizard.timeline.every(function (instance, index) {
                                if (false == instance.isActive) {
                                    return true;
                                }
                                
                                activeInstanceIndex = index;
                                return false;
                            });

                            if (typeof (activeInstanceIndex) != 'undefined') {
                                wizard.timeline[activeInstanceIndex].isActive = false;
                                wizard.timeline[activeInstanceIndex].isChecked = true;
                                
                                if (typeof (wizard.timeline[activeInstanceIndex + 1]) !== 'undefined') {
                                    wizard.router.navigate(wizard.timeline[activeInstanceIndex + 1].path, { trigger: true });
                                }
                            }
                        });
                    }
                },
                'click #wizardCTA-CancelInstallation': function() {
                    this.router.navigate('welcome', { trigger: true });
                },
            },
            timeline: [
                {
                    isActive: false,
                    isChecked: false,
                    path: 'check-requirements',
                    view: UVDeskCommunitySystemRequirementsView,
                },
                {
                    isActive: false,
                    isChecked: false,
                    path: 'configure-database',
                    view: UVDeskCommunityDatabaseConfigurationView,
                },
                {
                    isActive: false,
                    isChecked: false,
                    path: 'create-admin',
                    view: UVDeskCommunityAccountConfigurationView,
                },
                {
                    isActive: false,
                    isChecked: false,
                    path: 'install',
                    view: UVDeskCommunityInstallSetupView,
                },
            ],
            initialize: function(params) {
                this.router = params.router;
                this.reference_nodes.header = this.$el.find('#wizardHeader');
                this.reference_nodes.content = this.$el.find('#wizardContent');

                this.renderWizard();
            },
            iterateInstallationSteps: function(iteration) {
                if ('welcome' === iteration) {
                    this.enabled = false;

                    this.timeline[0].isChecked = false;
                    this.timeline[1].isChecked = false;
                    this.timeline[2].isChecked = false;
                    this.timeline[3].isChecked = false;

                    this.renderWizard();
                } else {
                    if (!this.enabled) {
                        this.router.navigate('welcome', { trigger: true });
                    } else {
                        let self = this;
    
                        this.timeline.every(function (installationStep, index) {
                            if (iteration == installationStep.path && typeof installationStep.view != 'undefined') {
                                self.timeline[index].isActive = true;
                                self.renderWizardInstallationStep(installationStep.view);

                                return false;
                            } else if (installationStep.isChecked) {
                                self.timeline[index].isActive = false;

                                return true;
                            }

                            self.router.navigate('welcome', { trigger: true });
                            return false;
                        });
                    }
                }
            },
            renderWizard: function() {
                let self = this;

                this.reference_nodes.header.html(self.wizard_default_header_template());
                this.reference_nodes.content.html(self.wizard_default_content_template());
            },
            renderWizardInstallationStep: function(InstallationWizardTemplateView) {
                let self = this;

                this.disableNextStep();
                this.reference_nodes.content.find('#wizardSetup').empty();
                this.activeSetupProcedure = new InstallationWizardTemplateView({ wizard: self });
            },
            enableNextStep: function() {
                this.$el.find('#wizardCTA-IterateInstallation').removeAttr('disabled');
            },
            disableNextStep: function() {
                this.$el.find('#wizardCTA-IterateInstallation').attr('disabled', 'disabled');
            },
        });

        Router = Backbone.Router.extend({
            wizard: undefined,
            routes: {
                ':installationStep': 'iterateInstallationProcedure',
            },
            initialize: function() {
                let self = this;

                // Initialize installation wizard
                this.wizard = new UVDeskCommunityInstallationWizardView({ router: self });
            },
            iterateInstallationProcedure: function(installationStep) {
                this.wizard.iterateInstallationSteps(installationStep);
            },
        });
    
        var router = new Router();
        Backbone.history.start({ push_state: true });
    });
})(jQuery);