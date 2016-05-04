/**
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */
/*
 * Mark Change Plugin for TYPO3 htmlArea RTE
 */
HTMLArea.MarkChange = Ext.extend(HTMLArea.Plugin, {
	/*
	 * This function gets called by the class constructor
	 */
	configurePlugin : function(editor) {
		/*
		 * Registering plugin "About" information
		 */
		var pluginInformation = {
			version		: '1.0',
			developer	: 'Jochen Rieger',
			developerUrl	: 'http://www.connecta.ag/',
			copyrightOwner	: 'Jochen Rieger',
			sponsor		: 'Connecta AG',
			sponsorUrl	: 'http://www.connecta.ag',
			license		: 'GPL'
		};
		this.registerPluginInformation(pluginInformation);
		/*
		 * Registering the buttons
		 */
		for (var i = 0, n = this.buttons.length; i < n; ++i) {
			var button = this.buttons[i];
			buttonId = button[0];
			
			var buttonConfiguration = {
				id: buttonId,
				tooltip: this.localize(buttonId + '-Tooltip'),
				action: 'onButtonPress',
				dialog: true,
				selection: true,
				iconCls: 'htmlarea-action-' + button[2],
				contextMenuTitle: this.localize(buttonId + '-contextMenuTitle')
			};
			this.registerButton(buttonConfiguration);
		}
		
		return true;
	},

	/*
	 * Sets of default configuration values for dialogue form fields
	 */
	configDefaults: {
		combo: {
			editable: true,
			selectOnFocus: true,
			typeAhead: true,
			triggerAction: 'all',
			forceSelection: true,
			mode: 'local',
			valueField: 'value',
			displayField: 'text',
			helpIcon: true,
			tpl: '<tpl for="."><div ext:qtip="{value}" style="text-align:left;font-size:11px;" class="x-combo-list-item">{text}</div></tpl>'
		}
	},
	
	/*
	 * The list of buttons added by this plugin
	 */
	buttons: [
		['MarkChange', null, 'mark-change']
	],

	/*
	 * This function gets called when the button was pressed.
	 *
	 * @param	object		editor: the editor instance
	 * @param	string		id: the button id or the key
	 *
	 * @return	boolean		false if action is completed
	 */
	onButtonPress: function (editor, id) {
			// Could be a button or its hotkey
		var buttonId = this.translateHotKey(id);
		buttonId = buttonId ? buttonId : id;

		// Get the parent element of the current selection
		// CAG TODO: find out if we really need the parent or maybe just the selection itself
		this.element = this.editor.getSelection().getParentElement();

		console.log('CAG: onButtonPress executed');
		console.log(this.element);
		
		this.openDialogue(
			buttonId,
			'Mark Change', // TODO: localize!
			this.getWindowDimensions(
				{
					width: 350,
					height: 560
				},
				buttonId
			)
		);
		return false;
	},


	/*
	 * Build the configuration of the the tab items
	 *
	 * @return	array	the configuration array of tab items
	 */
	// CAG JR / TODO (maybe): could be useful one day as an ExtJS templating example
	// otherwise: remove again
	buildTabItems: function () {
		var tabItems = [];
		Ext.iterate(this.maps, function (id, map) {
			tabItems.push({
				xtype: 'box',
				cls: 'character-map',
				title: this.localize(id),
				itemId: id,
				tpl: new Ext.XTemplate(
					'<tpl for="."><a href="#" class="character" hidefocus="on" ext:qtitle="<span>&</span>{1};" ext:qtip="{2}">{0}</a></tpl>'
				),
				listeners: {
					render: {
						fn: this.renderMap,
						scope: this
					}
				}
			});
		}, this);
		return tabItems;
	},

	
	/* Open the dialogue window
	 *
	 * @param	string		buttonId: the button id
	 * @param	string		title: the window title
	 * @param	integer		dimensions: the opening width of the window
	 *
	 * @return	void
	 */
	openDialogue: function (buttonId, title, dimensions) {

		var markedElement = null; // TODO: maybe fill this? Maybe not?
		
		this.dialog = new Ext.Window({
			title: 'Änderung markieren', // TODO: localize
			cls: 'htmlarea-window',
			border: false,
			width: dimensions.width,
			height: '300',
				// As of ExtJS 3.1, JS error with IE when the window is resizable
			resizable: !Ext.isIE,
			iconCls: this.getButton(buttonId).iconCls,
			layout: 'fit',
			listeners: {
				close: {
					fn: this.onClose,
					scope: this
				}
			},
			items: {
				
				xtype: 'tabpanel',
				height: 80,
				activeTab: 0,
				forceLayout: true,
				layoutOnTabChange: true,
				items: [
					{
						//title: this.localize('video'), // TODO: localize later
						title: 'Änderung markieren',
						defaultType: 'textfield',

						items: {

							xtype: 'fieldset',
							defaultType: 'textfield',
							labelWidth: 80,
							autoHeight: true,

							// TODO: localize all boxLabels, labels, etc.
							items: [
								{
									xtype: 'radio',
									fieldLabel: 'Modus',
									boxLabel: 'Als <strong>neu</strong> markieren',
									name: 'mode',
									inputValue: 'ins',
									checked: true
		            },
								{
									xtype: 'radio',
									fieldLabel: '',
									labelSeparator: '',
									boxLabel: 'Als <strong>entfernt</strong> markieren',
									name: 'mode',
									inputValue: 'del'
								},
								{
									xtype: 'datefield',
									fieldLabel: 'Zeitpunkt',
									itemId: 'timestamp',
									name: 'timestamp',
									format: 'd.m.Y H:i',
									value: new Date(),
									width: 180

								}/*,
								{
									itemId: 'width',
									fieldLabel: this.localize('width'),
									value: 200
								},
								{
									itemId: 'height',
									fieldLabel: this.localize('height'),
									value: 200
								}*/
							]
						}
					}/*,
					{
						title: this.localize('options'),
						defaultType: 'textfield',
						items: {
							xtype: 'fieldset',
							defaultType: 'textfield',
							labelWidth: 100,
							items: [
								{
									itemId: 'start',
									fieldLabel: this.localize('starttime'),
									value: 1
								},
								{
									itemId: 'end',
									fieldLabel: this.localize('endtime'),
									value: 2
								},
								{
									xtype: 'checkbox',
									itemId: 'autoplay',
									fieldLabel: this.localize('autoplay'),
									checked: true
								}
							]
						}
					}*/
				],
			},
			buttons: [
				//this.buildButtonConfig('OK', this.okHandler)
				this.buildButtonsConfig(markedElement, this.okHandler, this.deleteHandler)
			]
		});
		this.show();
	},


	/*
	 * This function builds the select dropdown for the mode (ins / del)
	 *
	 * @param	string		fieldName: the name of the field
	 * @param	string		fieldLabel: the label for the field
	 * @param	string		cshKey: the csh key
	 * 
	 * // CAG TODO: check if arguments are really needed
	 *
	 * @return	object		the style selection field object
	 */
	buildModeSelectField: function () {

		return {
			xtype: 'selectfield',
			label: 'Modus',
			options: [
				{text: 'First Option', value: 'first'},
				{text: 'Second Option', value: 'second'},
				{text: 'Third Option', value: 'third'}
			]
		};

	},
	// buildModeSelectField: function (fieldName, fieldLabel, cshKey) {
	// 	return new Ext.form.ComboBox(Ext.apply({
	// 		xtype: 'combo',
	// 		itemId: fieldName,
	// 		//fieldLabel: this.getHelpTip(fieldLabel, cshKey), // TODO: localize
	// 		fieldLabel: 'Modus',
	// 		width: 200,
	// 		store: new Ext.data.ArrayStore({
	// 			autoDestroy:  true,
	// 			fields: [ { name: 'text'}, { name: 'value'} ],
	// 			data: [['Als \'neu\' markieren', 'ins'], ['Als \'gelöscht\' markieren', 'del']] // TODO: localize
	// 		})
	// 		}, {
	// 		//tpl: '<tpl for="."><div ext:qtip="{value}" style="{style}text-align:left;font-size:11px;" class="x-combo-list-item">{text}</div></tpl>'
	// 		}, this.configDefaults['combo']
	// 	));
	// },


	/**
	 * Get the current marked element, if any is selected
	 *
	 * @return object the element or null
	 */
	getCurrentMarkedElement: function() {
		var markedElement = this.editor.getSelection().getParentElement();
		// Working around Safari issue
		if (!markedElement && this.editor.statusBar && this.editor.statusBar.getSelection()) {
			markedElement = this.editor.statusBar.getSelection();
		}
		if (!markedElement || !/^(ins|del)$/i.test(markedElement.nodeName)) {
			markedElement = this.editor.getSelection().getFirstAncestorOfType(['ins', 'del']);
		}
		return markedElement;
	},

	/*
	 * Build the dialogue buttons config
	 *
	 * @param	object		element: the element being edited, if any
	 * @param	function	okHandler: the handler for the ok button
	 * @param	function	deleteHandler: the handler for the delete button
	 *
	 * @return	object		the buttons configuration
	 */
	buildButtonsConfig: function (element, okHandler, deleteHandler) {
		var buttonsConfig = [this.buildButtonConfig('OK', okHandler)];

		if (element) {
			buttonsConfig.push(this.buildButtonConfig('Delete', deleteHandler));
		}
		buttonsConfig.push(this.buildButtonConfig('Cancel', this.onCancel));
		
		return buttonsConfig;
	},

	/*
	 * Handler when the ok button is pressed
	 */
	okHandler: function (button, event) {

		this.restoreSelection();
		console.log('okHandler clicked');

		// var tab = this.dialog.findByType('tabpanel')[0].getActiveTab();
		// var type = tab.getItemId();
		// var languageSelector = tab.find('itemId', 'language');
		// var language = languageSelector && languageSelector.length > 0 ? languageSelector[0].getValue() : '';
		// var termSelector = tab.find('itemId', 'termSelector');
		// var term = termSelector && termSelector.length > 0 ? termSelector[0].getValue() : '';
		// var abbrSelector = tab.find('itemId', 'abbrSelector');
		// var useTermField = tab.find('itemId', 'useTerm');
		
		this.close();

	}, // end function okHandler()

	/*
	 * Handler when the delete button is pressed
	 */
	deleteHandler: function (button, event) {

		this.restoreSelection();
		var abbr = this.params.abbr;
		if (abbr) {
			this.editor.getDomNode().removeMarkup(abbr);
		}
		this.close();
		event.stopEvent();

	}, // end function deleteHandler()
	
	/*
	 * Reset focus on the the current selection, if at all possible
	 *
	 */
	resetFocus: function () {
		this.restoreSelection();
	}

});
