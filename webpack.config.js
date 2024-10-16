// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isProduction = process.env.NODE_ENV == 'production';


const stylesHandler = MiniCssExtractPlugin.loader;



const config = {
    entry: {
        article: [
            './src/styles/article.scss',
            './src/ts/article.ts',
        ],
        index: [
            './src/styles/index.scss',
            './src/ts/article.ts',
        ],
        "404": [
            './src/styles/404.scss',
            './src/ts/404.ts',
        ],
        resist_tool: [
            "./src/styles/resist_tool.scss",
            "./src/ts/resistor_calculator.ts"
        ]
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new MiniCssExtractPlugin(),

        // Add your plugins here
        // Learn more about plugins from https://webpack.js.org/configuration/plugins/
    ],
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
            },
            {
                test: /\.css$/i,
                use: [stylesHandler, 'css-loader'],
            },
            {
                test: /\.s[ac]ss$/i,
                use: [stylesHandler, 'css-loader', {
                    loader: 'sass-loader',
                    options: {
                        api: 'modern',
                        sassOptions: {}
                    }
                }],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
    },
    devtool: 'eval',
    cache: false
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';
        config.devtool = 'source-map';
    } else {
        config.mode = 'development';
        config.cache = {
            type: 'filesystem',
            buildDependencies: {config: [__filename]}
        }
    }
    return config;
};
