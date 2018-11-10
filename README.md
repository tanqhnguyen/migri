# migri - agnostic migration tool

[![Build Status](https://travis-ci.org/tanqhnguyen/migri.svg?branch=master)](https://travis-ci.org/tanqhnguyen/migri)
[![npm version](https://badge.fury.io/js/migri.svg)](https://badge.fury.io/js/migri)

## Motivation
In a side project, I need to have a migration tool for both Postgresql and ArangoDB, can't find anything for ArangoDB, and all the available ones for Postgresql are kinda hard to use. For example, most of them organize the migration files in a flat structure, meaning that when there are many of them, it's impossible to keep track of the changes or revisit old changes.

Few years ago, I worked with this library called [schemup](https://github.com/brendonh/schemup), the way it works is to logically organize the migration files into groups. In a relational database, it means that each table and its related migrations are put inside a single file. The benefit is that all the changes to that particular table are easily managed.

I have been trying to look for a similar solution in Javascript but no luck, hence this library. `migri` is in its very early stage and used only in my side project.

## Install

```
npm install migri --save
```

or

```
yarn add migri
```

Add a new script to your package.json

```
{
  "scripts": {
    "migration": "migri"
  }
}
```

Then, just run `npm run migration run` or `yarn migration run` to apply the latest migrations.

Run `npm run migration help` to see all the available commands and options. There is only 1 at the moment, though

## Supported databases
At the moment, only Postgresql and ArangoDB are supported. However, adding new databases are as easy as adding a new connector and then implement 3 methods.

## Config file
By default if you don't specify any custom config file (through `-c` option), the default config file `migri.json` at the current working directory is used. The config file varies depending on the database that you are targeting. Below is an example for Postgresql

```
{
  "connector": {
    "name": "psql",
    "host": "postgres",
    "port": 5432,
    "database": {
      "env": "POSTGRES_DATABASE"
    },
    "username": {
      "env": "POSTGRES_USERNAME"
    },
    "password": {
      "env": "POSTGRES_PASSWORD"
    }
  }
}
```

It's straight forward, the required `connector.name` specifies what the database, and the rest are specific to the database connector. In this case, for postgresql we need `host`, `port`, `database`, `username`, and `password`. The values can be either a string, number or an object pointing to an environment variable in case you want to follow 12-factor methodology.

Here is another example for ArangoDB

```
{
  "parser": {
    "name": "js"
  },
  "connector": {
    "name": "arango",
    "host": "arango",
    "port": 8529,
    "database": {
      "env": "ARANGO_DATABASE"
    },
    "username": "root",
    "password": {
      "env": "ARANGO_PASSWORD"
    }
  }
}
```

In this one, there is also `parser` setting, this setting changes how `migri` parses the migration files, by default, it uses `yaml` format (more on this later). However, in the case of ArangoDB, they don't have any query to create collections (similar to tables in the relational world). Therefore, we need to pass the whole database object, hence the `js` format.

## Migration files

As mentioned previously, by default, `migri` uses `yaml` as the migration file's format, here is one example, `account.yaml` to create account table

```
- depends: null
  version: account_1
  query: >
    CREATE TABLE account (
      id SERIAL PRIMARY KEY
    );

- depends: account_1
  version: account_2
  query: >
    ALTER TABLE account ADD COLUMN name TEXT;
```

There are few things here, first of all, the file consists of multiple migration entries, each entry has `query` specifying the query that will be run. Then, there is a `version`, each version needs to be unique across all the migration files. A common way to name it is to use the file name + author + a number. It's so that when in a team, we can separate our migrations from others and resolve conflicts easier if any. Back to the example, the last attribute is `depends`. This specifies the dependencies of the migration. For example, when we need to create a `comment` table, and it depends on the latest version (`account_2`) of the account table, we have the following migration file (`comment.yaml`)

```
- depends: account_2
  version: comment_1
  query: >
    CREATE TABLE comment (
      id SERIAL PRIMARY KEY,
      author_id INT REFERENCES account(id)
    );
```

`depends` can be an array, so we can do this

```
- depends:
  - account_2
  - another_table_1
  version: comment_1
  query: >
    CREATE TABLE comment (
      id SERIAL PRIMARY KEY,
      author_id INT REFERENCES account(id)
    );
```

By default, `migri` looks for migration files in `migrations` folder relative to the current working directory. Set `migrationDir` option in the config file to change the location.