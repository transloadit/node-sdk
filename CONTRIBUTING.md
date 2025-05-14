# Contributing

We'd be happy to accept pull requests. If you plan on working on something big, please first drop us a line!

## Getting started

To get started, first fork the project on GitHub and clone the project using Git.

## Dependencies management

This project uses [Yarn](https://yarnpkg.com) 4 for dependency management. To install dependencies, run the following command from the project root:

```sh
yarn install
```

To check for updates, run:

```sh
yarn upgrade-interactive
```

## Linting

This project is linted using [ESLint](https://eslint.org). You can lint the project by running:

```sh
yarn lint:js
```

## Formatting

This project is formatted using [Prettier](https://prettier.io). You can check format the project:

```sh
yarn fix:formatting
```

## Testing

This project is tested using [Vitest](https://vitest.dev). There are two kinds of tests.

### Unit tests

Unit tests are in the [`test/unit`](test/unit) folder of the project. You can run them using the following command:

```sh
yarn yarn test:unit
```

This will also generate a coverage report in the `coverage` directory.

### Integration tests

Integration tests are in the [`test/integration`](test/integration) folder. They require some extra setup.

Firstly, these tests require the Cloudflare executable. You can download this with:

```sh
curl -fsSLo cloudflared-linux-amd64 https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
```

They also require a Transloadit key and secret, which you can get from https://transloadit.com/c/credentials.

You can run the integration tests with:

```sh
TRANSLOADIT_KEY='YOUR_TRANSLOADIT_KEY' TRANSLOADIT_SECRET='YOUR_TRANSLOADIT_SECRET' CLOUDFLARED_PATH='./cloudflared-linux-amd64' yarn test:integration
```

### Code Coverage

Coverage reports are:

- Generated locally in the `coverage` directory
- Uploaded to Codecov for tracking
- Enforced in CI (builds will fail if coverage drops below thresholds)

View the coverage report locally by opening `coverage/index.html` in your browser.

## Releasing

Only maintainers can make releases. Releases to [npm](https://www.npmjs.com) are automated using GitHub actions. To make a release, perform the following steps:

1. Update the version using Yarn, e.g. `yarn version patch` (n.b. use `yarn version prerelease` for pre-releases). This will update the version in the `package.json` file.
2. Commit the changes to the `package.json` file.
3. Create a new Git tag, e.g. `git tag v4.0.0-6`.
4. Push the tag to GitHub: `git push origin main --tags`
5. If the tests pass, GitHub actions will now publish the new version to npm.
6. When successful add [release notes](https://github.com/transloadit/node-sdk/releases).
