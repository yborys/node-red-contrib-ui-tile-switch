/**
 * Copyright 2020
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {

    function checkConfig(node, config) {
        if (!config || !config.hasOwnProperty("group")) {
            node.error(RED._("ui_tile-switch.error.no-group"));
            return false;
        }
        return true;
    }

    function setState(value, node){
        try {
            if(value === true){
                node.status({fill:"green",shape:"dot",text:"ON"});
                node.state = true;
            }                       
            if(value === false){
                node.status({fill:"red",shape:"ring",text:"OFF"});
                node.state = false;
            }   
        } catch (error) {node.warn(error);}
    }

    function HTML(config) {
        
        // add config to scope
        var configJson = JSON.stringify(config); 
        config.uiid = config.id.replace(/[^a-zA-Z0-9]/g, "");

        // html template
        var html = String.raw`
        <style> 
        .tile-switch {border-radius:8px;width:100%;height:100%;position:relative;
            padding:12px;box-sizing:border-box;cursor:pointer;outline:none;}       
        #a${config.uiid}.isActive {color: ${config.activeColor};background-color:${config.activeBgcolor};}
        #a${config.uiid}.isInActive {color: ${config.inactiveColor};background-color:${config.inactiveBgcolor};}
        </style>
        <div ng-click='click()' ng-dblclick='dblclick()' ng-init='init(`+configJson+`)' md-ink-ripple 
            class='tile-switch layout-column layout-align-space-between noselect trans' flex style=''
            ng-class='(status)? "isActive" : "isInActive"' id='a${config.uiid}'>
            <i ng-if='status' class='fa ${config.iconOn}' aria-hidden='true'></i>
            <i ng-if='!status' class='fa ${config.iconOff}' aria-hidden='true'></i>
            <div style='font-size:12px;text-align:right;'><b>${config.name}</b></div>            
        </div>`  
        return html;
    }

    var ui = undefined;

    function TileSwitchNode(config) {
        try {
            
            var node = this;
            var done = null;

            RED.nodes.createNode(this,config);

            if(ui === undefined) {
                ui = RED.require("node-red-dashboard")(RED);
            }

            if (checkConfig(node, config)) {

                var html = HTML(config);
                done = ui.addWidget({
                    node: node,			    // controlling node
                    width: config.width,	// width of widget
                    height: config.height,	// height of widget
                    format: html,		    // HTML/Angular code
                    templateScope: "local",	// scope of HTML/Angular(local/global)
                    group: config.group,    // belonging Dashboard group
                    order: config.order,
                    forwardInputMessages: config.passthrough,  //forward the input message to it's ouput
                    emitOnlyNewValues: false,               // if true - only emit new values.                                
                    storeFrontEndInputAsState: true,       // If the widgect accepts user input - should it update the backend stored state ?

                    // Callback to convert sent message.
                    convertBack: function (value) {
                        console.log("convertBack ", value);
                        return value;
                    },

                    // Callback to prepare message that is sent from the backend to the widget
                    beforeEmit: function(msg, value) {
                        console.log("beforeEmit ", msg, value);
                        setState(msg.payload, node);
                        return { msg: msg };
                    },

                    // Callback to prepare message FROM the UI before it is sent to next node
                    beforeSend: function (msg, orig) {                        
                        if (orig) {
                            console.log("beforeSend ", msg, orig);
                            setState(orig.msg.payload, node);
                            return orig.msg;                            
                        }
                    },

                    // Scope controller
                    initController: function($scope, events) {
                        //debugger;
                        $scope.flag = true;   // not sure if this is needed?    
                        $scope.status = false;                    

                        $scope.init = function (config) {
                            $scope.config = config;
                        };

                        $scope.$watch('msg', function(msg) {
                            if (!msg) { return; } // Ignore undefined msg

                            console.log("Watch msg ", msg);
                            $scope.status = msg.payload;
                        });

                        //$scope.$watch('state', function(state) {
                        //    if (!state) { return; } // Ignore undefined msg
                        //
                        //    console.log("Watch state ", state);                            
                        //});


                        $scope.dblclick = function(e) { 
                            $scope.send({payload: "doubleClick"});
                        };
                        $scope.click = function(e) {   
                            if($scope.config.toggle){
                                //$scope.status = !$scope.status;
                                $scope.send({payload: !$scope.status});                               
                            }
                        };
                    }
                });
            }
        }
        catch (e) {            
            console.warn(e);		
        }

        node.on("close", function() {
            if (done) {
                done();
            }
        });
    }
    // register node
    setImmediate(function() {
        RED.nodes.registerType("ui_tile-switch", TileSwitchNode);
    })

}