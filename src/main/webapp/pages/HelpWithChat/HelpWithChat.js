Application.$controller("HelpWithChatPageController", ["$scope", function($scope) {
    "use strict";

    /* perform any action on widgets/variables within this block */
    $scope.onPageReady = function() {
        /*
         * variables can be accessed through '$scope.Variables' property here
         * e.g. to get dataSet in a staticVariable named 'loggedInUser' use following script
         * $scope.Variables.loggedInUser.getData()
         *
         * widgets can be accessed through '$scope.Widgets' property here
         * e.g. to get value of text widget named 'username' use following script
         * '$scope.Widgets.username.datavalue'
         */
        console.log($scope.Widgets);
    };



    $scope.watsonChatbot2Watsonresponse = function($isolateScope) {
        var data = $isolateScope.watsonresponse;

        console.log("user = " + JSON.stringify($scope.Variables.loggedInUser.getData()));
        console.log("conversation = " + JSON.stringify(data));

        // Check input and possibly add to scope variable.
        // TODO: this method should be placed on the outbound side - i.e., the initial call to Watson Conversation.
        // This would allow us to perform the NLU query in parallel to the conversation analysis.
        if (data.context.system.dialog_turn_counter == 1) {
            initializeConversationContext(data);
        } else {
            // Clear page variables if we have re-entered the conversation (i.e., reset)
            if (_.includes(data.output.nodes_visited, "Conversation Starter")) {
                // Note: clearing context variables is performed on the conversation node itself.
                // Clear the page variables
                if (true) {
                    clearPageVariables();
                }
            }

            // If this is the irrelevant node, it is terminal
            if (_.includes(data.output.nodes_visited, "Irrelevant")) {
                console.log("Found IRRELEVANT");
                $scope.Variables.isReadyToSearch.setValue("dataValue", true);
            } else if (data.intents && data.intents[0].confidence < 0.3) {
                console.log("Low confidence", data.intents[0].confidence);
                $scope.Variables.isReadyToSearch.setValue("dataValue", true);
            }

            // Capture the user input into an array.
            $scope.Variables.staticUserInputs.addItem({
                input: data.input.text
            });
            console.log("staticUserInputs = " + JSON.stringify($scope.Variables.staticUserInputs.getData()));

            // add the conversation entities. (score = confidence)
            var jso = $scope.Variables.convEntities.getData(); // JSON key:{value="", score=""}
            _.forEach(data.entities, function(entity) {
                jso[entity.entity] = {
                    "value": entity.value,
                    "score": entity.confidence,
                    "input": data.input.text.slice(entity.location[0], entity.location[1])
                };
            });
            $scope.Variables.convEntities.setData(jso);
            console.log("convEntities = " + JSON.stringify(jso));

            sendInputToNLU(data.input.text);
            console.log("After async call to sendInputToNLU");

            var hasPDF = parseDataForPDF(data);
            $scope.Widgets.iframeJobAid.show = hasPDF;
            if (hasPDF || data.context.isReadyToSearch) {
                $scope.Variables.isReadyToSearch.setValue("dataValue", true);

            }
            console.log("FromConv isReadyToSearch = " + $scope.Variables.isReadyToSearch.getValue("dataValue"));
        }
    }; // END $scope.watsonChatbot2Watsonresponse = function($isolateScope) {

    $scope.getFileUrl = function(doc) {
        var url = "resources/files/" + doc.replace("~page", "#page").replace(/ /g, '_').replace("(", "_").replace(")", "_");
        console.log("FOUND PDF:", doc, " --> ", url);
        return url;
    }


    function initializeConversationContext(data) {
        console.log("New Conversation, setting context.");
        data.context.employeeRole = $scope.Variables.loggedInUser.getData().roles[0];
        data.context.employeeCountry = "US";
        data.context.employeeLocation = "US";
    }



    // request body for NLU service, update text prior to sending.
    $scope.requestBodyNLU = {
        "text": "",
        "features": {
            "entities": {
                "emotion": false,
                "sentiment": false,
                "limit": 5
            },
            "keywords": {
                "emotion": false,
                "sentiment": false,
                "limit": 5
            },
            "concepts": {
                "limit": 5
            },
            "semantic_roles": {
                "entities": true,
                "keywords": true,
                "limit": 5
            },
            "categories": {},
            "relations": {},
            "sentiment": {}
        }
    };


    // called in order to send input to NLU... 
    function sendInputToNLU(inputText) {
        console.log("User Input ==> " + inputText);
        if (inputText) {
            $scope.requestBodyNLU.text = inputText;
            console.log($scope.requestBodyNLU);
            $scope.Variables.invokeNLUService.setInput('RequestBody', $scope.requestBodyNLU);
            $scope.Variables.invokeNLUService.invoke();
        }
    };


    // This does not seem to get called.  Not sure why.
    $scope.invokeNLUServiceOnResult = function(variable, data) {
        console.log("invokeNLUServiceOnResult:", variable, data);
    };
    // This gets called on error condition (keeps wm popup from automatically displaying)
    $scope.invokeNLUServiceOnError = function(variable, data) {
        console.log("invokeNLUServiceOnError:", variable, data);

        var isReadyToSearch = $scope.Variables.isReadyToSearch.getValue("dataValue");
        console.log("FromNLUError isReadyToSearch = " + isReadyToSearch);
        if (isReadyToSearch) {
            sendInputToDiscovery();
        }
    };
    // "onSuccess": "invokeNLUServiceonSuccess($event, $scope)",
    $scope.invokeNLUServiceOnSuccess = function(variable, data) {
        console.log("invokeNLUServiceOnSuccess:", variable, data);

        // If NLU is successful, then utterance is not trivial and should be logged for nlq...
        $scope.Variables.nlqUserInputs.addItem({
            input: $scope.requestBodyNLU.text
        });
        console.log("nlqUserInputs = " + JSON.stringify($scope.Variables.nlqUserInputs.getData()));

        var jso = {};

        // add the nlu entities.
        jso = $scope.Variables.nluEntities.getData(); // JSON key:{value="", score=""}
        _.forEach(data.entities, function(entity) {
            jso[entity.text] = {
                "value": entity.text,
                "score": entity.relevance,
                "type": entity.type,
                "disambiguation": entity.disambiguation
            };
        });
        $scope.Variables.nluEntities.setData(jso);
        console.log("nluEntities = " + JSON.stringify(jso));

        // add the NLU keywords.
        jso = $scope.Variables.nluKeywords.getData(); // JSON key:{value="", score=""}
        _.forEach(data.keywords, function(keyword) {
            jso[keyword.text] = {
                "value": keyword.text,
                "score": keyword.relevance
            };
        });
        $scope.Variables.nluKeywords.setData(jso);
        console.log("nluKeywords = " + JSON.stringify(jso));

        // add the NLU concepts.
        jso = $scope.Variables.nluConcepts.getData(); // JSON key:{value="", score="", source=""}
        _.forEach(data.concepts, function(concept) {
            jso[concept.text] = {
                "value": concept.text,
                "score": concept.relevance,
                "source": concept.dbpedia_resource
            };
        });
        $scope.Variables.nluConcepts.setData(jso);
        console.log("nluConcepts = " + JSON.stringify(jso));

        var isReadyToSearch = $scope.Variables.isReadyToSearch.getValue("dataValue");
        console.log("FromNLUSuccess isReadyToSearch = " + isReadyToSearch);
        if (isReadyToSearch) {
            sendInputToDiscovery();
        }

    };



    // Build Discovery Query and send to service...
    function sendInputToDiscovery() {

        // true for natural language query, false for enriched keyword search.
        var nlq = true;

        // Send natural language query
        if (nlq) {
            var snlq = _.map($scope.Variables.nlqUserInputs.getData(), "input").join(" ");

            console.log("nlq: " + snlq);

            // we will always get 10 passages; count governs how many documents we return.
            $scope.Variables.invokeDiscoveryService.setInput('count', "20");
            $scope.Variables.invokeDiscoveryService.setInput('query', "");

            $scope.Variables.invokeDiscoveryService.setInput('highlight', false);
            $scope.Variables.invokeDiscoveryService.setInput('natural_language_query', snlq);

            /* NOTE:
            // We could send discovery query first for relevancy-trained document IDs.
            // Then we could send subsequent passage retreival query filtered by document IDs from first.
            // query has the form:
            $scope.Variables.invokeDiscoveryService.setInput('filter', "_id:(a769fcaf-a1da-4912-8c29-1f02bde160cc|709f2029-e3b7-43c5-a496-734008683f03)|original_page:125");
            */


        } else {
            // Build the smart query...
            var keywordParams = [];
            var entityParams = [];

            const fieldName = 'enriched_text';

            /* Not used
            staticUserInputs = [{"input":"is IBM from Canada?"},{"input":"how do i request military leave?"}]
            */

            /* entities from nlu...
            Note: in query, the entities.type and entities.text have to be EXACT matches.
            This is generally not a problem.
            
            nluEntities = {"IBM":{"value":"IBM","score":0.33,"type":"Company"},"Canada":{"value":"Canada","score":0.33,"type":"Location","disambiguation":{"subtype":["Country"]}}}
            */
            _.forEach($scope.Variables.nluEntities.getData(), function(v, k) {
                pushToArrayIfNotPresent(entityParams, fieldName + '.entities.type', v.type);
                pushToArrayIfNotPresent(entityParams, fieldName + '.entities.text', v.value);
            });

            /* entities from conv...
            When we specifically set entities up to be search attributes, prefix the entity with "search-".
            Then, set up elements that will be the EXACT search string, then set up synonyms that map to that search string, which will allow "close"
            matches, especially if fuzzy matching is turned on.
            Do not consider other types of conversation entities, because these generally have other purposes related to handling the conversation itself.
            
            convEntities = {"country":{"value":"CANADA","score":1, "input":"canadian"}}
            */
            _.forEach($scope.Variables.convEntities.getData(), function(v, k) {
                // Only consider {"search-color":{"value":"RED","score":1, "input":"maroon"}}
                // will be handled as filter = color:RED 
                if (k.startsWith("search-")) {
                    var searchKey = k.replace("search-", "");
                    pushToArrayIfNotPresent(entityParams, searchKey, v.value);
                }
            });

            /* keywords from nlu...
            NOTE: keywords need to match EXACTLY when used in a query.  For example, "tea light" does not match "tea lights".
            Better approach is to use natural language query, which may have that ability.

            nluKeywords = {"IBM":{"value":"IBM","score":0.916215},"Canada":{"value":"Canada","score":0.910255},"military leave":{"value":"military leave","score":0.949121}}        
            */
            _.forEach($scope.Variables.nluKeywords.getData(), function(v, k) {
                pushToArrayIfNotPresent(keywordParams, fieldName + '.keywords.text', k);
            });

            /* Not used concepts from nlu...
            nluConcepts = {}        
            */

            console.log("Discovery query: " + keywordParams.join(','));
            console.log("Discovery filter: " + entityParams.join(','));

            $scope.Variables.invokeDiscoveryService.setInput('query', keywordParams.length ? (keywordParams.join(',')) : "");
            $scope.Variables.invokeDiscoveryService.setInput('filter', entityParams.length ? (entityParams.join(',')) : "");
            $scope.Variables.invokeDiscoveryService.setInput('highlight', true);
            $scope.Variables.invokeDiscoveryService.setInput('natural_language_query', "");
        }

        console.log(JSON.stringify($scope.Variables.invokeDiscoveryService.dataBinding));
        $scope.Variables.invokeDiscoveryService.invoke();

        clearPageVariables();
    }



    // request body for DISCOVERY service, update prior to sending.
    // This gets called on error condition (keeps wm popup from automatically displaying)
    $scope.invokeDiscoveryServiceOnError = function(variable, data) {
        console.log("invokeDiscoveryServiceOnError:", variable, data);
    };
    // "onSuccess": "invokeNLUServiceonSuccess($event, $scope)",
    $scope.invokeDiscoveryServiceOnSuccess = function(variable, data) {
        console.log("invokeDiscoveryServiceOnSuccess:", variable, data);

        // for each returning passage, pull in the associated document information...
        // per Anish, there is no guarantee that the associated document will exist in RESULTS,
        // but it is highly likely.
        var passageIDs = _.map(data.passages, 'document_id');
        var resultIDs = _.map(data.results, 'id');

        console.log("passages", passageIDs);
        console.log("results", resultIDs);

        _.forEach(passageIDs, function(v, k) {
            var i = _.indexOf(resultIDs, v);
            if (i == -1) {
                console.log(k, v, "Document NOT found.");
            } else {
                console.log(k, v, "Document found at", i);
            }
        });
        _.forEach(resultIDs, function(v, k) {
            var i = _.indexOf(passageIDs, v);
            if (i == -1) {
                console.log(k, v, "Passage NOT found.");
            } else {
                console.log(k, v, "Passage found at", i);
            }
        });

        // massage the data here so it gets reflected in the livelist widget
        for (var i = (data.results.length - 1); i >= 0; i--) {
            var id = data.results[i].id;
            // we are retrieving 20 documents and fixed 10 passages.
            // this should be a sufficient number of documents to make sure that the backing document
            // for each passage is returned. (at least until we have a trained system)
            var idx = _.indexOf(passageIDs, id);
            if (idx == -1) {
                console.log(i, id, "Removing: No passage found for document.");
                data.results.splice(i, 1);
            } else {
                console.log(i, id, "Updating: Passage found for document.");
                data.results[i].text = data.passages[idx].passage_text;
            }
        }


        // Remove duplicate PDF references...
        // Do not do this for the moment, we might have a case where a single pdf is referenced
        // by multiple passages, in which case, we could show the same doc reference w different passages.
        for (var i = (data.results.length - 1); i > 0; i--) {
            if (data.results[i].single_pdf === data.results[i - 1].single_pdf) {
                console.log("Removing", i, id);
                //data.results.splice(i, 1);
            }
        }



        // $scope.Widgets.entityCheckbox.datavalue = [];
        // $scope.Widgets.keywordCheckbox.datavalue = [];
        // $scope.Widgets.entity_ConversationCheckbox.datavalue = [];
    };





    // Check watson output for text of the form [test.pdf][page#] and handle accordingly.
    function parseDataForPDF(data) {
        var ret = false;
        /* TODO: validate pdf in context variable */
        if (data.context.file && data.context.file.url) {
            // Handle if found in context.
            $scope.sourceURL = $scope.getFileUrl(data.context.file.url);
            data.context.file = {};
            ret = true;
        }
        return ret;
    }


    function pushToArrayIfNotPresent(array, key, value) {
        if (value) {
            var str = key + ':"' + value + '"';
            if (!_.includes(array, str))
                array.push(str);
        }
    }

    function clearPageVariables() {
        console.log("Clearing Page Variables...");
        $scope.Variables.staticUserInputs.clearData();
        $scope.Variables.nlqUserInputs.clearData();
        $scope.Variables.convEntities.setData({});
        $scope.Variables.nluEntities.setData({});
        $scope.Variables.nluConcepts.setData({});
        $scope.Variables.nluKeywords.setData({});
        $scope.Variables.isReadyToSearch.setValue("dataValue", false);
    }





    $scope.button1Click = function($event, $isolateScope) {
        $scope.Widgets.watsonChatbot2.send("message to be sent");

    };


    $scope.watsonChatbot2Beforesend = function($isolateScope) {
        // Clear buttons in outbound context, since they have already been handled at this point.
        if ($isolateScope.requestbody.context) {
            $isolateScope.requestbody.context.input = {};
        }
        console.log("watsonChatbot2Beforesend:", $isolateScope.requestbody);
    };


    $scope.rating1Change = function($event, $isolateScope, item, currentItemWidgets, newVal, oldVal) {

    };

}]); // END Application.$controller

Application.$controller("iframedialog1Controller", ["$scope",
    function($scope) {
        "use strict";
        $scope.ctrlScope = $scope;
    }
]);