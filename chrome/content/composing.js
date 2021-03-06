Components.utils.import("resource://sendlater3/dateparse.jsm");

var Sendlater3Composing = {
    composeListener: {
	NotifyComposeBodyReady: function() {
	    gContentChanged = true;
	    SaveAsDraft();
	    if (SL3U.getBoolPref("show_edit_alert")) {
		SL3U.alert(window, null,
			   SL3U.PromptBundleGet("draftSaveWarning"));
	    }
	},
	NotifyComposeFieldsReady: function() {},
	ComposeProcessDone: function() {},
	SaveInFolderDone: function() {}
    },

    CheckSendAt2: function(where, send_button) {
	SL3U.Entering("Sendlater3Composing.CheckSendAt2(from " + where + ")");
	Sendlater3Composing.CheckSendAt(send_button);
    },

    setBindings: {
	observe: function(disabled) {
            var main_key = document.getElementById("key_sendLater");
            var alt_key = document.getElementById("sendlater3-key_sendLater3");
            if (main_key.sl3EventListener) {
                main_key.removeEventListener("command", main_key.sl3EventListener, false);
                alt_key.removeEventListener("command", alt_key.sl3EventListener, false);
            }
            if (disabled) {
                main_key.sl3EventListener = Sendlater3Composing.builtInSendLater;
                alt_key.sl3EventListener = Sendlater3Composing.builtInSendLater;
                alt_key.setAttribute("disabled", true);
            }
	    if (SL3U.getBoolPref("alt_binding")) {
                main_key.sl3EventListener = Sendlater3Composing.builtInSendLater;
                alt_key.sl3EventListener = Sendlater3Composing.mySendLater;
                alt_key.setAttribute("disabled", false);
	    }
	    else {
                main_key.sl3EventListener = Sendlater3Composing.mySendLater;
                alt_key.sl3EventListener = Sendlater3Composing.builtInSendLater;
                alt_key.setAttribute("disabled", true);
	    }
            main_key.addEventListener("command", main_key.sl3EventListener, false);
            alt_key.addEventListener("command", alt_key.sl3EventListener, false);
	}
    },

    builtInSendLater: function() {
	document.getElementById("msgcomposeWindow")
	    .setAttribute("sending_later", true);
	goDoCommand("cmd_sendLater");
    },

    mySendLater: function() {
        goDoCommand("cmd_sendLater");
    },

    main: function() {
	SL3U.initUtil();

        window.removeEventListener("load", Sendlater3Composing.main, false);

        if (SL3U.alert_for_enigmail()) {
	    Sendlater3Composing.setBindings.observe(true);
            return;
        }
        
	function CheckForXSendLater() {
	    SL3U.Entering("Sendlater3Composing.main.CheckforXSendLater");
	    Sendlater3Composing.prevXSendLater = false;
	    Sendlater3Composing.prevRecurring = false;
	    if (gMsgCompose != null) {
		var msgCompFields = gMsgCompose.compFields;
		if (msgCompFields && msgCompFields.draftId!="") {
		    var messageURI = msgCompFields.draftId.replace(/\?.*/, "");
		    SL3U.dump("Checking " + messageURI);
		    var accountManager = Components
			.classes["@mozilla.org/messenger/account-manager;1"]
			.getService(Components.interfaces
				    .nsIMsgAccountManager);
		    var messenger = Components
			.classes["@mozilla.org/messenger;1"]
			.getService(Components.interfaces.nsIMessenger);
		    var content = "";
		    var MsgService = messenger
			.messageServiceFromURI(messageURI);
		    var messageHDR = messenger.msgHdrFromURI(messageURI);
		    var hdr = messageHDR.getStringProperty("x-send-later-at");
		    if (hdr) {
			Sendlater3Composing.prevXSendLater = 
			    sendlater3DateToSugarDate(new Date(hdr));
			gMsgCompose.RegisterStateListener(Sendlater3Composing
							  .composeListener);
		    }
		    hdr = messageHDR.getStringProperty("x-send-later-recur");
		    if (hdr)
			Sendlater3Composing.prevRecurring = hdr;
			
		    SL3U.dump("prevXSendLater= " +
			      Sendlater3Composing.prevXSendLater +
			      ", prevRecurring=" +
			      Sendlater3Composing.prevRecurring);
		}
	    }
	    SL3U.PrefService.addObserver(SL3U.pref("alt_binding"),
					 Sendlater3Composing.setBindings,
					 false);
	    Sendlater3Composing.setBindings.observe();
	    SL3U.Leaving("Sendlater3Composing.main.CheckforXSendLater");
	}                            

	var windowInitListener = {
	    handleEvent : function(event) {
		var msgcomposeWindow = document
		    .getElementById("msgcomposeWindow");
		msgcomposeWindow.removeAttribute("sending_later");
		msgcomposeWindow.removeAttribute("sl3_send_button");
		CheckForXSendLater(); 
	    } 
	}

	var sendMessageListener = {
	    handleEvent: function(event) {
		var msgcomposeWindow = document
		    .getElementById("msgcomposeWindow");
		if (msgcomposeWindow.getAttribute("sending_later")) {
		    msgcomposeWindow.removeAttribute("sending_later");
		    Sendlater3Composing.PrepMessage2();
		    return;
		}
		var msgtype = msgcomposeWindow.getAttribute("msgtype");
		if ((msgtype == nsIMsgCompDeliverMode.Now ||
		     msgtype == nsIMsgCompDeliverMode.Background) &&
		    SL3U.getBoolPref("sendbutton")) {
		    Sendlater3Composing.CheckSendAt2("Sendlater3Composing.main.sendMessageListener.handleEvent condition #1", true);
		    event.preventDefault();
		}
		if (msgtype == nsIMsgCompDeliverMode.Later) {
		    Sendlater3Composing.CheckSendAt2("Sendlater3Composing.main.sendMessageListener.handleEvent condition #2", true);
		    event.preventDefault();
		}
	    }
	}

	var msgcomposeWindow = document.getElementById("msgcomposeWindow");
	msgcomposeWindow.addEventListener("compose-window-init",
					  windowInitListener, false);
	// When window is first loaded compose-window-init is not generated.
	windowInitListener.handleEvent(null);
	msgcomposeWindow.addEventListener("compose-send-message",
					  sendMessageListener, false);

	if (typeof(DoSpellCheckBeforeSend) == 'function' &&
	    DoSpellCheckBeforeSend !=
	    Sendlater3Composing.MyDoSpellCheckBeforeSend) {
	    Sendlater3Composing.OldDoSpellCheckBeforeSend =
		DoSpellCheckBeforeSend;
	    DoSpellCheckBeforeSend =
		Sendlater3Composing.MyDoSpellCheckBeforeSend;
	}
    },

    confirmPutInOutbox: function() {
	if (! SL3U.getBoolPref("show_outbox_alert")) {
	    return true;
	}
	var prompts = Components.
	    classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
	var check = {value: true};
	var title = SL3U.PromptBundleGet("OutboxConfirmTitle");
	var message = SL3U.PromptBundleGet("OutboxConfirmMessage");
	var askagain = SL3U.PromptBundleGet("ConfirmAgain");
	var result = prompts.confirmCheck(null, title, message, askagain,
					  check);
	if (! check.value) {
	    SL3U.setBoolPref("show_outbox_alert", false);
	}
	return result;
    },

    CheckSendAt: function(send_button) {
	SL3U.Entering("Sendlater3Composing.CheckSendAt");
	if (send_button)
	    document.getElementById("msgcomposeWindow")
		.setAttribute("sl3_send_button", true);
	else
	    document.getElementById("msgcomposeWindow")
		.removeAttribute("sl3_send_button");
	window.openDialog("chrome://sendlater3/content/prompt.xul",
			  "SendAtWindow", "modal,chrome,centerscreen", 
			  { finishCallback: Sendlater3Composing.SendAtTime,
			    continueCallback: function() {
				if (! Sendlater3Composing.confirmPutInOutbox()){
				    return false;
				}
				var w = document
				    .getElementById("msgcomposeWindow");
				w.setAttribute("sending_later", true);
				Sendlater3Composing.ContinueSendLater();
				return true;
			    },
			    sendCallback: function() {
				var w = document
				    .getElementById("msgcomposeWindow");
				w.setAttribute("sending_later", true);
				SendMessage();
			    },
			    cancelCallback: Sendlater3Composing.CancelSendLater,
			    previouslyTimed: Sendlater3Composing.prevXSendLater,
			    previouslyRecurring: Sendlater3Composing.prevRecurring,
 });
	SL3U.Leaving("Sendlater3Composing.CheckSendAt");
    },

    ReallySendAtTimer: null,
    ReallySendAtClosure: null,
    ReallySendAtCallback: {
	notify: function (timer) {
	    SL3U.Entering("Sendlater3Composing.ReallySendAtCallback.notify", timer);
	    var sendat = Sendlater3Composing.ReallySendAtClosure.at;
	    var recur = Sendlater3Composing.ReallySendAtClosure.recur;
	    var args = Sendlater3Composing.ReallySendAtClosure.args;

	    // If it has been at least a week since we last asked the
	    // user to donate, and the user has scheduled at least
	    // five messages since the last time we asked, and the
	    // user hasn't previously told us to stop asking, pop up a
	    // donation dialog.
	    var p1 = "ask.time";
	    var p2 = "ask.sent";
	    var last_ask = SL3U.getIntPref(p1);
	    var sent = SL3U.getIntPref(p2);
	    var now = Math.round((new Date()).getTime() / 1000);
	    if ((sent >= 4) && (last_ask > 0) &&
		(now - last_ask >= 60 * 60 * 24 * 7)) {
		SL3U.setIntPref(p1, now);
		SL3U.setIntPref(p2, 0);
		window.openDialog("chrome://sendlater3/content/ask.xul",
				  "AskWindow", "chrome,centerscreen", {});
	    }
	    else if (sent > -1) {
		if (last_ask == 0) {
		    SL3U.setIntPref(p1, now);
		}
		SL3U.setIntPref(p2, sent + 1);
	    }

	    gCloseWindowAfterSave = true;
	    var identity = getCurrentIdentity();
	    Sendlater3Composing.PrepMessage(sendat, recur, args);
	    GenericSendMessage(nsIMsgCompDeliverMode.SaveAsDraft);
	    Sendlater3Composing.PostSendMessage();

	    SL3U.SetUpdatePref(identity.key);
	    defaultSaveOperation = "draft";
	    SL3U.Leaving("Sendlater3Composing.ReallySendAtCallback.notify");
	}
    },

    SendAtTime: function(sendat, recur_value, args) {
	SL3U.Entering("Sendlater3Composing.SendAtTime", sendat, recur_value, args);
	Sendlater3Composing.ReallySendAtClosure = { at: sendat,
						    recur: recur_value,
						    args: args };
	Sendlater3Composing.ReallySendAtTimer = Components
	    .classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);
	Sendlater3Composing.ReallySendAtTimer.initWithCallback(
	    Sendlater3Composing.ReallySendAtCallback,
	    500,
	    Components.interfaces.nsITimer.TYPE_ONE_SHOT
	);
	SL3U.Leaving("Sendlater3Composing.SendAtTime");
    },

    ContinueSendLaterTimer: null,
    ContinueSendLaterCallback: {
	notify: function (timer) {
	    SL3U.Entering("Sendlater3Composing.ContinueSendLaterCallback.notify");
	    goDoCommand('cmd_sendLater');
	    SL3U.Leaving("Sendlater3Composing.ContinueSendLaterCallback.notify");
	}
    },

    ContinueSendLater: function() {
	SL3U.Entering("Sendlater3Composing.ContinueSendLater");
	Sendlater3Composing.ContinueSendLaterTimer = Components
	    .classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);
	Sendlater3Composing.ContinueSendLaterTimer.initWithCallback(
	    Sendlater3Composing.ContinueSendLaterCallback,
	    500,
	    Components.interfaces.nsITimer.TYPE_ONE_SHOT
	);
	SL3U.Leaving("Sendlater3Composing.ContinueSendLater");
    },

    CancelSendLater: function() {
	var msgcomposeWindow = document
	    .getElementById("msgcomposeWindow");
	msgcomposeWindow.removeAttribute("sending_later");
	msgcomposeWindow.removeAttribute("sl3_send_button");
    },

    prevXSendLater: false,
    prevRecurring: false,

    MyDoSpellCheckBeforeSend: function() {
	var msgcomposeWindow = document
	    .getElementById("msgcomposeWindow");
	if (msgcomposeWindow.getAttribute("sl3_send_button"))
	    return false;
	if (Sendlater3Composing.OldDoSpellCheckBeforeSend === undefined)
	    return SL3U.PrefService.getBoolPref("mail.SpellCheckBeforeSend");
	else
	    return Sendlater3Composing.OldDoSpellCheckBeforeSend();
    },

    PrepMessage: function(sendat, recur, args) {
	var msgcomposeWindow = document.getElementById("msgcomposeWindow");
	msgcomposeWindow.setAttribute("sending_later", true);
	msgcomposeWindow.sendLater3SendAt = sendat;
	msgcomposeWindow.sendLater3Recur = recur;
	msgcomposeWindow.sendLater3Args = args;
	msgcomposeWindow.sendLater3Type = gMsgCompose.type;
	msgcomposeWindow.sendLater3OriginalURI = gMsgCompose.originalMsgURI;
    },

    PrepMessage2: function() {
	var compWin = document.getElementById("msgcomposeWindow");
	var sendat = compWin.sendLater3SendAt;
	var recur = compWin.sendLater3Recur;
	var args = compWin.sendLater3Args;
	var msgCompFields = gMsgCompose.compFields;
	if (sendat) {
            if ('expandMailingLists' in gMsgCompose) {
                gMsgCompose.expandMailingLists();
            }
            var headers = {}
            headers['X-Send-Later-At'] = SL3U.FormatDateTime(sendat,true)
            headers['X-Send-Later-Uuid'] = SL3U.getInstanceUuid()
            if (recur) {
                var recurheaders = SL3U.RecurHeader(sendat, recur, args);
                for (header in recurheaders) {
                    headers[header] = recurheaders[header];
                }
            }
            if ('setHeader' in msgCompFields) {
                for (header in headers) {
                    msgCompFields.setHeader(header, headers[header]);
                }
            }
            else {
                var head = '';
                for (header in headers) {
                    head += header + ": " + headers[header] + "\r\n";
                }
	        msgCompFields.otherRandomHeaders += head;
            }
	    msgCompFields.messageId = Components
		.classes["@mozilla.org/messengercompose/computils;1"]
		.createInstance(Components.interfaces.nsIMsgCompUtils)
		.msgGenerateMessageId(getCurrentIdentity());
	    if ('checkAndPopulateRecipients' in gMsgCompose) {
		gMsgCompose.checkAndPopulateRecipients(true, false, new Object);
	    }
	}
    },
	
    PostSendMessage: function() {
	var compWin = document.getElementById("msgcomposeWindow");
	Sendlater3Composing.SetReplyForwardedFlag(compWin.sendLater3Type,
						  compWin.sendLater3OriginalURI);
	compWin.sendLater3SendAt = null;
	compWin.sendLater3Recur = null;
	compWin.sendLater3Args = null;
	compWin.sendLater3Type = null;
	compWin.sendLater3OriginalURI = null;
    },

    SetReplyForwardedFlag: function(type, originalURI) {
	var state;
	if (! originalURI) {
	    return;
	}
	try {
	    var messenger = Components
		.classes["@mozilla.org/messenger;1"]
		.getService(Components.interfaces.nsIMessenger);
	    var hdr = messenger.msgHdrFromURI(originalURI);
	    switch (type) {
	    case nsIMsgCompType.Reply:
	    case nsIMsgCompType.ReplyAll:
	    case nsIMsgCompType.ReplyToSender:
	    case nsIMsgCompType.ReplyToGroup:
	    case nsIMsgCompType.ReplyToSenderAndGroup:
	    case nsIMsgCompType.ReplyWithTemplate:
	    case nsIMsgCompType.ReplyToList:
		hdr.folder.addMessageDispositionState(hdr, hdr.folder.nsMsgDispositionState_Replied);
		break;
	    case nsIMsgCompType.ForwardAsAttachment:
	    case nsIMsgCompType.ForwardInline:
		hdr.folder.addMessageDispositionState(hdr, hdr.folder.nsMsgDispositionState_Forwarded);
		break;
	    }
	}
	catch (ex) {
	    SL3U.debug("Failed to set flag for reply / forward");
	}
    },

    uninit: function() {
	SL3U.PrefService.removeObserver(SL3U.pref("alt_binding"),
					Sendlater3Composing.setBindings);
	SL3U.uninitUtil();
    }
}

window.addEventListener("load", Sendlater3Composing.main, false);
window.addEventListener("unload", Sendlater3Composing.uninit, false);
