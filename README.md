## How to Debug the Language Server

0. Install Visual Studio Code (which is our first class client/test bed), Nodejs, and Yarn.

1. Create a folder where you would like to store the GML-Tools Language Server and the GML-Tools VSCode Client Implementation.

2. Open a terminal in that folder and clone the [Language Server](https://github.com/GameMakerDiscord/gml-tools-langserver.git) with:

    ```git
    git clone https://github.com/GameMakerDiscord/gml-tools-langserver.git
    ```

3. Clone this remote as well to the same folder:
    ```git
    git clone
    https://github.com/sanboxrunner/gml-tools-vsc-client
    ```
4. Install dependencies for each folder (you will need to move your terminal into each sub-folder for this):

    ```npm
    yarn
    ```

5. Compile the Language Server and the Client with the Tasks "Build" or "Watch". Do not compile by command line, as the Language Server and Client connect over a local interchange while debugging created in those "Build" and "Watch" commands.

6. Due to a bug in the `tsconfig.json` (see [this issue](https://github.com/Microsoft/TypeScript/issues/26531)), the absolute path of the sourceRoot in the Language Server `tsconfig.json` file will need to be added. Navigate to `"./gml-tools-ls/tsconfig.json"` and edit "sourceRoot" to be the following:
    ```json
    ...
    "sourceRoot": "ABSOLUTEPATH/gml-tools-ls/src",
    ...
    ```
    where "ABSOLUTEPATH" is the absolute path to `gml-tools-ls`. 

7. Begin the Extension by pressing `F5`. To place breakpoints in the Typescript of the language server, once the client is running, launch the "Attach to Server" process from the debug menu, or use the Client/Server option to launch both at once.

8. Happy coding! If any problems occur, please add an issue. If you have any suggestions for simplifying this process while keeping the language server and the separate, please submit an issue. Thank you!

