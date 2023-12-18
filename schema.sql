CREATE TABLE Users (
  id			    INTEGER		    NOT NULL	  PRIMARY KEY		AUTOINCREMENT,
  discord_id	TEXT			    NOT NULL	  UNIQUE,
  created_at	TEXT			    NOT NULL					        DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Transactions (
  id			    INTEGER			  NOT NULL	  PRIMARY KEY		AUTOINCREMENT,
  user_from	  INTEGER			  NOT NULL,
  user_to		  INTEGER			  NOT NULL,
  amount		  DECIMAL(10,2)	NOT NULL,
  reason		  TEXT			    NOT NULL,
  created_at	TEXT			    NOT NULL		              DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_from) REFERENCES Users (id),
  FOREIGN KEY (user_to)   REFERENCES Users (id)
);
