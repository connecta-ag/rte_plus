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
	 * The list of buttons added to the RTE toolbar by this plugin
	 */
	buttons: [
		['MarkChange', null, 'mark-change']
	],

	/**
	 * Array to store values for the dialog form.
	 */
	params: {},

	/**
	 * This function gets called by the class constructor
	 *
	 * @param 	Object	editor
	 * @returns {boolean}
     */
	configurePlugin : function(editor) {
		/*
		 * Registering plugin "About" information
		 */
		var pluginInformation = {
			version		: '1.0',
			developer	: 'Jochen Rieger, Kai Groetenhardt',
			developerUrl	: 'http://www.connecta.ag/',
			copyrightOwner	: 'Connecta AG',
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
	}, // end function configurePlugin()

	/**
	 * This function gets called when the button "MarkChange" was pressed in the RTE toolbar.
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

		this.params = {
			markAvailable: false,
			dataTimestamp: "",
			mode: "ins",
		};

		var node = this.getSelectedNode();
		if (node != null && this.isAllowedNode(node)) {
			/* The currently selected node is an <ins> or <del> node, so we can read the attributes to fill the dialog
			 * form. */
			this.params.markAvailable = true;
			this.params.mode = node.nodeName.toLowerCase();
			this.params.dataTimestamp = node.getAttribute("data-timestamp");
		} else if (!this.editor.getSelection().isEmpty()) {
			/* We only got a text, but maybe one of our nodes in there. */
			var text = this.editor.getSelection().getHtml();
			if (text && text != null) {
				var tagname = "ins";
				var offset = text.toLowerCase().indexOf('<' + tagname);
				if (offset == -1) {
					tagname = "del";
					offset = text.toLowerCase().indexOf('<' + tagname);
				}
				if (offset != -1) {
					/* Yes, we found one of our nodes. We now have to extract the data. */
					var ATagContent = text.substring(offset);
					offset = ATagContent.indexOf('>');
					ATagContent = ATagContent.substring(0, offset+1) + "</" + tagname + ">";
					var parser = new DOMParser();
					var xmlDoc = parser.parseFromString(ATagContent,"text/xml");
					var timestamp = xmlDoc.childNodes[0].getAttribute("data-timestamp");

					/* Save the data for the dialog form. */
					this.params.markAvailable = true;
					this.params.mode = tagname;
					this.params.dataTimestamp = timestamp;
				}
			}
		}

		this.openDialog(
			buttonId,
			'Mark Change', // TODO: localize!
			this.getWindowDimensions(
				{
					width: 350,
					height: 210,
				},
				buttonId
			)
		);
		return false;
	}, // end function onButtonPress()

	/**
	 * Open the dialog window
	 *
	 * @param	string		buttonId: the button id
	 * @param	string		title: the window title
	 * @param	integer		dimensions: the opening width of the window
	 *
	 * @return	void
	 */
	openDialog: function (buttonId, title, dimensions) {

		/* Prepare the date to show in the dialog. */
		var currentDate = null;
		if (this.params.dataTimestamp != "") {
			currentDate = this.params.dataTimestamp
		} else {
			currentDate = new Date();
		}

		/* Figure out which mode should be selected. */
		var modeInsMarked = true;
		if (this.params.mode == "del") {
			modeInsMarked = false;
		}

		/* Create the dialog. */
		this.dialog = new Ext.Window({
			title: this.localize('dialog.title'),
			cls: 'htmlarea-window',
			border: false,
			width: dimensions.width,
			height: dimensions.height,
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
						checked: modeInsMarked,
					},
					{
						xtype: 'radio',
						fieldLabel: '',
						labelSeparator: '',
						boxLabel: 'Als <strong>entfernt</strong> markieren',
						name: 'mode',
						inputValue: 'del',
						checked: !modeInsMarked,
					},
					{
						xtype: 'datefield',
						fieldLabel: 'Zeitpunkt',
						itemId: 'timestamp',
						name: 'timestamp',
						format: 'd.m.Y H:i',
						value: currentDate,
						width: 180

					},
				]
			},
			buttons: [
				this.buildButtonsConfig(this.okHandler, this.deleteHandler)
			]
		});
		this.show();
	}, // end function openDialog()

	/*
	 * Build the dialogue buttons config
	 *
	 * @param	Object		element: the element being edited, if any
	 * @param	function	okHandler: the handler for the ok button
	 * @param	function	deleteHandler: the handler for the delete button
	 *
	 * @return	Object		the buttons configuration
	 */
	buildButtonsConfig: function (okHandler, deleteHandler) {
		var buttonsConfig = [this.buildButtonConfig('OK', okHandler)];

		if (this.params.markAvailable) {
			buttonsConfig.push(this.buildButtonConfig('Delete', deleteHandler));
		}
		buttonsConfig.push(this.buildButtonConfig('Cancel', this.onCancel));
		
		return buttonsConfig;
	}, // end function buildButtonsConfig()

	/**
	 * Handler when the ok button is pressed.
	 *
	 * @param 	Object	button
	 * @param 	Object	event
     */
	okHandler: function (button, event) {

		this.restoreSelection();

		/* Marking of multiple paragraphs leads to strange beahaviour, so we don't want that. */
		if (this.editor.getSelection().getHtml().toLowerCase().indexOf('</p>') != -1) {
			TYPO3.Dialog.InformationDialog({
				title: "Markierung nicht möglich",
				msg: "Markierungen sind nur innerhalb eines Absatzes möglich. Möchten Sie mehrere Absätze markieren, markieren Sie diese bitte einzeln.",
				fn: function () {  }
			});
			return;
		}

		/* Get the selected mode in the dialog form. */
		var mode = 'ins';
		var modeSelectors = this.dialog.find('name', 'mode');
		for (i = 0; i < modeSelectors.length; i++) {
			var currentModeSelector = modeSelectors[i];
			if (currentModeSelector.checked) {
				mode = currentModeSelector.inputValue;
				break;
			}
		}

		/* Get the selected date. */
		var timestampInput = this.dialog.find('name', 'timestamp')[0];

		/* Cleanup the selecteion (remove all <ins> and <del> nodes) */
		var range = null;
		this.restoreSelection();
		var node = this.getSelectedNode();
		range = this.editor.getSelection().createRange();
		var bookMark = this.editor.getBookMark().get(range);
		this.cleanSelection(node, range);
		range = this.editor.getBookMark().moveTo(bookMark);
		this.editor.getSelection().selectRange(range);

		/* Create a new <ins> or <del> node with the given configuration and add it to the editor. */
		var changeTag = this.editor.document.createElement(mode);
		changeTag.setAttribute('data-timestamp', timestampInput.value);
		changeTag.innerHTML = this.editor.getSelection().getHtml();
		//this.editor.getSelection().insertNode(changeTag);
		this.editor.getSelection().insertHtml(changeTag.outerHTML);

		//this.editor.getSelection().execCommand('insertText', false, changeTag.outerHTML);

		this.close();
		event.stopEvent();

	}, // end function okHandler()

	/**
	 * Clean up all ins and del tags intesecting with the range in the given node.
	 *
	 * @param 	Object	node
	 * @param 	Object	range
     */
	cleanSelection: function(node, range) {
		if (this.isAllowedNode(node)) {
			var intersection = false;
			if (!HTMLArea.isIEBeforeIE9) {
				this.editor.focus();
				intersection = HTMLArea.DOM.rangeIntersectsNode(range, node);
			} else {
				if (this.editor.getSelection().getType() === 'Control') {
					// we assume an image is selected
					intersection = true;
				} else {
					var nodeRange = this.editor.document.body.createTextRange();
					nodeRange.moveToElementText(node);
					intersection = range.inRange(nodeRange) || ((range.compareEndPoints('StartToStart', nodeRange) > 0) && (range.compareEndPoints('StartToEnd', nodeRange) < 0)) || ((range.compareEndPoints('EndToStart', nodeRange) > 0) && (range.compareEndPoints('EndToEnd', nodeRange) < 0));
				}
			}
			if (intersection) {
				while (node.firstChild) {
					node.parentNode.insertBefore(node.firstChild, node);
				}
				node.parentNode.removeChild(node);

			}
		} else {
			var child = node.firstChild;
			var nextSibling;
			while (child) {
				// Save next sibling as child may be removed
				nextSibling = child.nextSibling;
				if (child.nodeType === HTMLArea.DOM.ELEMENT_NODE || child.nodeType === HTMLArea.DOM.DOCUMENT_FRAGMENT_NODE) {
					this.cleanSelection(child, range);
				}
				child = nextSibling;
			}
		}
	},

	/**
	 * Handler when the delete button is pressed.
	 *
	 * @param 	Object	button
	 * @param 	Object	event
     */
	deleteHandler: function (button, event) {
		this.restoreSelection();
		var node = this.getSelectedNode();
		if (node != null && this.isAllowedNode(node)) {
			this.editor.getSelection().selectNode(node);
		}
		var range = this.editor.getSelection().createRange();
		this.cleanSelection(node, range);

		this.close();
		event.stopEvent();

	}, // end function deleteHandler()

	/**
	 * Finds the selected <ins> or <del> node or the parent node of the selected area.
	 *
	 * @returns {Object}
	 */
	getSelectedNode: function () {
		var node = this.editor.getSelection().getFirstAncestorOfType('ins');
		if (node == null) {
			node = this.editor.getSelection().getFirstAncestorOfType('del');
		}
		if (node == null) {
			node = this.editor.getSelection().getParentElement();
		}
		return node;
	},

	/**
	 * Checks if the given node is one of the allowed nodes. Allowed nodes are <ins> and <del>.
	 *
	 * @param 	Object		node
	 * @return 	{boolean}
	 */
	isAllowedNode: function (node) {
		return (/^ins$/i.test(node.nodeName) || /^del$/i.test(node.nodeName));
	},
});
