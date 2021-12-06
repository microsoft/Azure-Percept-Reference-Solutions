# people-counting-with-azure-percept-vision
Detect and count the people using the Percept DK hardware, Azure IoT Hub, Stream Analytics, and Power BI dashboard

The goal of this project is to be able to detect and count the people with Percept DK advice and show the figure in Power BI dashboard.

Future work:
- Add the steps in README to activate the AVA pipeline 
- Create the SQL server and design the data schema 
- Design the Power BI dashboard and embed the recording video from the AVA portal

## Solution Architecture
![Solution Architecture](docs/images/solution-architect.png)

- Input : video stream
    ![Input](docs/images/input.png)

- Output: count of people in Power BI dashboard 
  
    ![Power BI](docs/images/power-bi.png)


## Prerequisites
- Percept DK ([Purchase](https://www.microsoft.com/en-us/store/build/azure-percept/8v2qxmzbz9vc))
- Azure Subscription : ([Free trial account](https://azure.microsoft.com/en-us/free/))
- Power BI subsription: ([Try Power BI for free](https://go.microsoft.com/fwlink/?LinkId=874445&clcid=0x409&cmpid=pbi-gett-hero-try-powerbifree))
- Power BI workspace: ([Create the new workspaces in Power BI](https://docs.microsoft.com/en-us/power-bi/collaborate-share/service-create-the-new-workspaces#create-one-of-the-new-workspaces))
  

## Device setup
1. Follow [Quickstart: unbox and assemble your Azure Percept DK components](https://docs.microsoft.com/en-us/azure/azure-percept/quickstart-percept-dk-unboxing) and the next steps.


## Content

| File             | Description                                                   |
|-------------------------|---------------------------------------------------------------|
| `readme.md`             | This readme file                                              |
| `deployment.template.json`    | The delopyment the edge modules of this people counting Solution |
| `envtemplate`    | The list of the enviroment varialbes for .env use |


## Steps
1. Create a file named `.env` in this folder based on `envtemplate`. Provide values for all variables.
2. Visit the [CountModule folder](https://github.com/leannhuang/people-counting-with-azure-percept-vision/tree/main/modules/CountModule) to deploy edge modules on your edge device
3. Add a consumer group to your IoT hub [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-live-data-visualization-in-power-bi#add-a-consumer-group-to-your-iot-hub)
4. Create Stream Analytics Service [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-live-data-visualization-in-power-bi#create-a-stream-analytics-job)
5. Add an input to the Stream Analytics job [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-live-data-visualization-in-power-bi#add-an-input-to-the-stream-analytics-job)
6. Add an output to the Stream Analytics job [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-live-data-visualization-in-power-bi#add-an-output-to-the-stream-analytics-job)
7. Configure the SQL query of the Stream Analytics [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-live-data-visualization-in-power-bi#configure-the-query-of-the-stream-analytics-job)

    Replace the `SQL query` below and fill in the corresponding values
    ```
        SELECT
            *
        INTO
            [YourOutputAlias]
        FROM
            [YourInputAlias]
        WHERE People_Count IS NOT NULL
    ```

8. Run the Stream Analytics job [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-live-data-visualization-in-power-bi#run-the-stream-analytics-job)
9. Create and publish a Power BI report to visualize the data [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-live-data-visualization-in-power-bi#create-and-publish-a-power-bi-report-to-visualize-the-data) 
    For the step 6,
    - On the `Fields` pane, expand the table that you specified when you created the output for the Stream Analytics job.
    - Drag `EventEnqueuedUtcTime` to Axis on the Visualizations pane.
    - Drag `People_Count` to Values.

        ![Power BI Columns](docs/images/power-bi-columns.png)
    - A line chart is created. The x-axis displays date and time in the UTC time zone. The y-axis displays count of the people from the Percept DK.
    - Save the report.
    
        ![Save the report](docs/images/save-report.png)
    


## Credits and references
- [Tutorial: Visualize real-time sensor data from Azure IoT Hub using Power BI](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-live-data-visualization-in-power-bi#create-a-stream-analytics-job)
- [Message handler sample code](https://github.com/Azure/azure-iot-sdk-python/blob/master/azure-iot-device/samples/async-edge-scenarios/receive_data.py)
- [Youtube Video](https://www.youtube.com/watch?v=AyUvpXyUqQo)