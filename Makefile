SHELL := /bin/bash
COFFEE     = node_modules/.bin/coffee
COFFEELINT = node_modules/.bin/coffeelint
MOCHA      = node_modules/.bin/mocha --compilers coffee:coffee-script --require "coffee-script/register"
REPORTER   = nyan

lint:
	@[ ! -f coffeelint.json ] && $(COFFEELINT) --makeconfig > coffeelint.json || true
	$(COFFEELINT) --file ./coffeelint.json src

build:
	make lint || true
	$(COFFEE) $(CSOPTS) -c -o lib src/TransloaditClient.coffee

test: build
	$(MOCHA) --reporter $(REPORTER) test/

compile:
	@echo "Compiling files"
	time make build

watch:
	watch -n 2 make -s compile

release-major: build test
	npm version major -m "Upgrade to %s"
	git push
	npm publish

release-minor: build test
	npm version minor -m "Upgrade to %s"
	git push
	npm publish

release-patch: build test
	npm version patch -m "Upgrade to %s"
	git push
	npm publish

.PHONY: test lint build release compile watch
