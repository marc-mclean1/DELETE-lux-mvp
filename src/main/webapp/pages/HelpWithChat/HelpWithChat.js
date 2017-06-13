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
            if (hasPDF || data.context.isReadyToSearch) {
                $scope.Variables.isReadyToSearch.setValue("dataValue", true);
            }
            console.log("FromConv isReadyToSearch = " + $scope.Variables.isReadyToSearch.getValue("dataValue"));
        }
    }; // END $scope.watsonChatbot2Watsonresponse = function($isolateScope) {

    $scope.getFileUrl = function(doc) {
        var url = "resources/files/" + "test.pdf";

        //$scope.sourceURL = "resources/files/" + url.replace(/ /g, '_');
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

            $scope.Variables.invokeDiscoveryService.setInput('query', "");
            $scope.Variables.invokeDiscoveryService.setInput('filter', "");
            $scope.Variables.invokeDiscoveryService.setInput('natural_language_query', snlq);
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
        //needed to empty the datavalue as the widget has a minor bug
        console.log("invokeDiscoveryServiceOnSuccess:", variable, data);
        // $scope.Widgets.entityCheckbox.datavalue = [];
        // $scope.Widgets.keywordCheckbox.datavalue = [];
        // $scope.Widgets.entity_ConversationCheckbox.datavalue = [];
    };





    // Check watson output for text of the form [test.pdf][page#] and handle accordingly.
    function parseDataForPDF(data) {
        var ret = false;

        /* First, check for data in context variable */
        if (data.context.file && data.context.file.url) {
            // Handle if found in context.
            var url = data.context.file.url.replace("~page", "#page");
            console.log("FOUND PDF IN CONTEXT:", url);
            $scope.sourceURL = "resources/files/" + url.replace(/ /g, '_');
            data.context.file = {};
            ret = true;
        } else {
            //ret = parseDataForPDF_deprecated(data);
        }
        return ret;
    }


    // Remove this method for production... it is deprecated now that we are storing file information in context.        
    function parseDataForPDF_deprecated(data) {
        var ret = false;
        var output_text = _.get(data, 'output.text');

        /* check for a message from chat, last entry first */
        if (Array.isArray(output_text)) {
            _.forEachRight(output_text, function(text, index) {
                if (_.includes(text, ".pdf]")) {
                    console.log("FOUND PDF");
                    var boolClearPDF = false;
                    // parse the PDF information (find last mentioned PDF)
                    var pos = text.lastIndexOf(".pdf]");
                    for (var i = pos; i >= 0; i--) {
                        if (text[i] == "[") {
                            ret = true;
                            if (i !== 0 && text[i - 1] == "-") {
                                boolClearPDF = true;
                            }
                            pos += 4;
                            var pdf = text.substring(i + 1, pos);
                            var page = "";
                            var url = pdf;
                            var im = text.length;
                            if (pos + 1 < im && text[pos + 1] == "[") {
                                for (i = (pos + 2); i < im; i++) {
                                    if (text[i] == "]") {
                                        page = _.toInteger(text.substring(pos + 2, i));
                                        if (page > 0) {
                                            console.log("FOUND PAGE");
                                            url += "#page=" + page;
                                            page = "[" + page + "]";
                                        }
                                        break;
                                    }
                                }
                            }
                            console.log("URL = " + url);

                            // only handle if an open bracket is found, otherwise, we do nothing.
                            $scope.sourceURL = "resources/files/" + url.replace(/ /g, '_');

                            // Now, depending on boolClearPDF, either remove brackets or entire reference.
                            if (boolClearPDF) {
                                data.output.text[index] = text.replace("-[" + pdf + "]" + page, "");
                            } else { // will preserve page as i.e., test.pdf[2].
                                data.output.text[index] = text.replace("[" + pdf + "]", pdf);
                            }
                            break;
                        }
                    }
                }
            });
        } else {
            //handle the string - this should never happen.
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




}]); // END Application.$controller