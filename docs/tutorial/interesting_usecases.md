# Interesting Use Cases
There are many interesting gru.ai use cases. In this document, we will explore some of the most common and useful use cases for the extension, including information extraction and business analysis. By following the steps outlined in this document, you can make the most of the extension's capabilities and enjoy a more efficient and productive browsing experience.

## Use Cases Categories

### 1. Information Extraction

#### 1.1 List Programming Languages and Average Salary
When you're doing research on software engineer, and you find out some webpage listed the popular programming languages and their average salary, you can use the `/ask_page` command to extract the table data.

<img src="../images/usecases/extract_information_from_webpage.png"/>

You can try sorting the table by chat with the agent.

<img src="../images/usecases/sort_programming_language_by_average_salary.png" width="278" height="445"/>

### 2. Business Analysis

#### 2.1 Learn Overseas warehouse operation process
When you're investigating overseas warehouse operation process flow, you can use the `/ask_page` command to draw the flow in mermaid format.

<img src="../images/usecases/mermaid_sequence_diagram_en.png"/>

#### 2.2 Sentiment analysis for company news
When you're analyzing the sentiment of company news, you can use the `/ask_page` command to extract the news content and analyze the sentiment.

<img src="../images/usecases/news_sentiment_analysis.png"/>

### 3. Data Analysis

#### 3.1 Data Visualization in Spreadsheet
When you're analysis data in google spreadsheet, and you don't know how to insert chart, you can use the `/ask_page` command to ask Gru.

<img src="../images/usecases/insert_pie_chart_in_google_spreadsheet.png"/>

In this case, many users may don't the formula `=QUERY(E:I, "SELECT E, SUM(I) GROUP BY E")` before. Gru can help you to learn new formula.

#### 3.2 Generate SQL in Superset
When you're analyzing data in Superset, and if you would like to generate SQL for the data analysis, you can use the `/ask_page` command to ask Gru.

<img src="../images/usecases/generate_sql_when_use_superset.png"/>

In this case, the user asked Gru to generate SQL to count the name and group by version.