var dbversion = 3;
var usedb = indexedDB;

var repository = new function(){
    var self = this;

    this.initialize = function(orgId){
        self.orgId = orgId;           

        // if(typeof(Worker) !== "undefined") {
        //     if(typeof(worker) == "undefined") {
        //         self.worker = new Worker("/js/background.js");
        //     }
        //     self.worker.onmessage = function(event) {
        //         console.log( event.data );
        //     };
        // } else {
        //     console.warn("Web Worker not available.");
        // }   

        if (usedb) {  

            var request = indexedDB.open(orgId, dbversion);
            request.onerror = function(event) {
                console.warn("Database error: " + event.target.errorCode);
                $.topic("db.open.error").publish();
            };
            request.onsuccess = function(event) {
                self.db = event.target.result;
                console.log("Database opened");
                $.topic("db.open.success").publish();
                $.topic("repository.initialized").publish();               
            };
            request.onupgradeneeded = function(event) { 
                console.log("Database upgrade needed");
                self.db = event.target.result;
                self.ensureOrganisationsStore();
                self.ensureMembersStore();
                self.ensureMatchesStore();
            };

        }
        else
        {
            console.warn("Browser doesn't support a stable version of IndexedDB.");
            $.topic("repository.initialized").publish(); 
        }
    }

    this.ensureOrganisationsStore =  function(){
        if (usedb && !self.db.objectStoreNames.contains('organisations')) {
            var orgStore = self.db.createObjectStore("organisations", { keyPath: "guid" });
        }
    }

    this.ensureMembersStore =  function(b){
         if (usedb && !self.db.objectStoreNames.contains('members')) {
            var memberStore = self.db.createObjectStore("members", { keyPath: "relGuid" });
         }
    }

    this.ensureMatchesStore =  function(b){
         if (usedb && !self.db.objectStoreNames.contains('matches')) {
            var matchesStore = self.db.createObjectStore("matches", { keyPath: "guid" });
            matchesStore.createIndex("jsDTCode", "jsDTCode")
         }
    }

    this.loadOrganization = function(){
        vbl.orgDetail(self.orgId, function(orgs){
            if(usedb){
                var tx = self.db.transaction("organisations", "readwrite").objectStore("organisations");
                orgs.forEach(function(o){
                tx.add(o);
                });     
            }  
            else{
                 self.orgs = orgs;
             }
              $.topic("vbl.organisation.loaded").publish();                 
        }); 
    }

    this.loadMembers = function(){
        vbl.members(self.orgId, function(members){
            if(usedb){
                var tx = self.db.transaction("members", "readwrite").objectStore("members");
                members.forEach(function(m){
                tx.add(m);
                });
            }    
            else{
                 self.members = members;
             }
             $.topic("vbl.members.loaded").publish();
        }); 
    }

    this.loadMatches = function(){
        vbl.matches(self.orgId, function(matches){
             if(usedb){
                var tx = self.db.transaction("matches", "readwrite").objectStore("matches");
                matches.forEach(function(m){
                tx.add(m);
                });
             }
             else{
                 self.matches = matches;
             }
             $.topic("vbl.matches.loaded").publish();
        }); 
    }

    this.currentOrganisation = function(callback){
         if(usedb){
            self._currentOrganisationFromDb(callback);           
         }
         else{
            self._currentOrganisationFromArrays(callback); 
         }
    }

    this._currentOrganisationFromDb = function(callback){
        var tx = self.db.transaction("organisations", "readonly");
        var store = tx.objectStore("organisations");

        store.openCursor().onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if(callback) callback(match);
            }
        }
    }
    
    this._currentOrganisationFromArrays = function(callback){
       callback(self.orgs[0]);
    }

    this.futureMatches = function(teamId, callback){
         if(usedb){
            self._futureMatchesFromDb(teamId, callback);           
         }
         else{
            self._futureMatchesFromArrays(teamId, callback); 
         }
    }

    this._futureMatchesFromDb = function(callback){
        var tx = self.db.transaction("matches", "readonly");
        var store = tx.objectStore("matches");
        var index = store.index("jsDTCode");

        var today = new Date();

        var range = IDBKeyRange.lowerBound(today.getTime());
        index.openCursor(range).onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if(callback) callback(match);
                cursor.continue();
            }
        }
    }

    this._futureMatchesFromArrays = function(teamId, callback){
         var today = new Date().getTime();
            var futureMatches = [];
            self.matches.forEach(function(match){
                if(match.jsDTCode > today){
                    futureMatches.push(match);
                }
            });

            callback(futureMatches);
    }

    this.nextMatch = function(callback){
         if(usedb){
            self._nextMatchFromDb(callback);           
         }
        else{
            self._nextMatchFromArrays(callback); 
         }
    }

    this._nextMatchFromDb = function(callback){
        var tx = self.db.transaction("matches", "readonly");
        var store = tx.objectStore("matches");
        var index = store.index("jsDTCode");

        var today = new Date();

        var range = IDBKeyRange.lowerBound(today.getTime());
        index.openCursor(range).onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if(callback) callback(match);
            }
        }         
    }

    this._nextMatchFromArrays = function(callback){
         var today = new Date().getTime();
            var futureMatches = [];
            self.matches.forEach(function(match){
                if(match.jsDTCode > today){
                    futureMatches.push(match);
                }
            });

            if(futureMatches.length > 0)
            {
                futureMatches.sort(function(a,b) {return (a.jsDTCode > b.jsDTCode) ? 1 : ((b.jsDTCode > a.jsDTCode) ? -1 : 0);} );
                callback(futureMatches[0])
            }
    }

    this.nextMatchOfTeam = function(teamId, callback){
         if(usedb){
            self._nextMatchOfTeamFromDb(teamId, callback);           
         }
         else{
            self._nextMatchOfTeamFromArrays(teamId, callback); 
         }
    }

    this._nextMatchOfTeamFromArrays = function(teamId, callback){
         var today = new Date().getTime();
            var futureMatchesOfTeam = [];
            self.matches.forEach(function(match){
                if((match.tTGUID == teamId || match.tUGUID == teamId) && match.jsDTCode > today){
                    futureMatchesOfTeam.push(match);
                }
            });

            if(futureMatchesOfTeam.length > 0)
            {
                futureMatchesOfTeam.sort(function(a,b) {return (a.jsDTCode > b.jsDTCode) ? 1 : ((b.jsDTCode > a.jsDTCode) ? -1 : 0);} );
                callback(futureMatchesOfTeam[0])
            }
    }

    this._nextMatchOfTeamFromDb = function(teamId, callback){
        var tx = self.db.transaction("matches", "readonly");
        var store = tx.objectStore("matches");
        var index = store.index("jsDTCode");

        var today = new Date();

        var range = IDBKeyRange.lowerBound(today.getTime());
        index.openCursor(range).onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if(match.tTGuid == teamId || match.tUGuid == teamId)
                {
                    if(callback) callback(match);
                }
                else{
                    cursor.continue();
                }                
            }
        }
    }
}
