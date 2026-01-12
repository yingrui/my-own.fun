import React, { useState } from "react";
import type { TableColumnsType } from "antd";
import { Space, Table, Tag, Tooltip, Button, Popconfirm } from "antd";

import {
  LikeOutlined,
  LikeFilled,
  DislikeOutlined,
  DislikeFilled,
} from "@ant-design/icons";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import LocalConversationRepository, {
  ConversationRecord,
  InteractionRecord,
} from "@src/shared/repositories/LocalConversationRepository";
import "./index.css";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

interface ConversationsManagementProps {
  config: GluonConfigure;
}

const ConversationsManagement: React.FC<ConversationsManagementProps> = ({
  config,
}) => {
  const [records, setRecords] = useState<ConversationRecord[]>([]);
  const [brief, setBrief] = useState<string>("");
  const repository = new LocalConversationRepository();

  const recordsBrief = (records: ConversationRecord[]) => {
    const interactionsCount = records.reduce(
      (c, r) => c + r.interactions.length,
      0,
    );
    const evaluatedCount = records.reduce(
      (c, r) => c + r.interactions.filter((i) => i.like !== undefined).length,
      0,
    );
    const satisfiedCount = records.reduce(
      (c, r) => c + r.interactions.filter((i) => i.like === true).length,
      0,
    );
    const satisfiedRate =
      evaluatedCount === 0 ? 0 : satisfiedCount / evaluatedCount;

    if (evaluatedCount > 0) {
      return intl
        .get("options_app_history_conversations_brief", {
          interactionsCount,
          satisfiedRate: satisfiedRate.toFixed(2),
        })
        .d(
          `Total {interactionsCount} interactions, satisfied rate is {satisfiedRate}`,
        );
    } else {
      return intl
        .get("options_app_history_conversations_brief_no_eval", {
          interactionsCount,
        })
        .d(`Total {interactionsCount} interactions, no evaluation yet.`);
    }
  };

  const getRecords = async () => {
    if (records.length === 0) {
      const conversationRecords = await repository.findAll();
      setRecords(conversationRecords);
      setBrief(recordsBrief(conversationRecords));
    }
  };
  getRecords();

  const deleteRecord = async (record: ConversationRecord) => {
    await repository.delete(record.key);
    setRecords(await repository.findAll());
  };

  const keepRecord = async (record: ConversationRecord) => {
    record.recordStatus = "Kept";
    await repository.update(record);
    setRecords(await repository.findAll());
  };

  const evaluateInteraction = async (
    interactionRecord: InteractionRecord,
    like: boolean,
  ) => {
    const matchedRecords = records.filter(
      (record) =>
        record.interactions.findIndex(
          (i) => i.uuid === interactionRecord.uuid,
        ) >= 0,
    );
    if (matchedRecords.length > 0) {
      const matchedRecord = matchedRecords[0];
      const matchedInteraction = matchedRecord.interactions.find(
        (i) => i.uuid === interactionRecord.uuid,
      );
      if (matchedInteraction) {
        matchedInteraction.like = like;
        await repository.update(matchedRecord);
        setRecords(await repository.findAll());
      }
    }
  };

  const deleteAllRecords = async () => {
    await repository.deleteAll();
    setRecords([]);
    setBrief(recordsBrief([]));
  };

  const columns: TableColumnsType<ConversationRecord> = [
    {
      title: intl.get("options_app_history_column_uuid").d("Uuid"),
      dataIndex: "uuid",
      key: "uuid",
      render: (text) => text.substring(0, 8).toLowerCase(),
    },
    {
      title: intl.get("options_app_history_column_time").d("Time"),
      dataIndex: "datetime",
      key: "datetime",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.datetime.localeCompare(b.datetime),
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: intl.get("options_app_history_column_rounds").d("Rounds"),
      dataIndex: "rounds",
      key: "rounds",
    },
    {
      title: intl
        .get("options_app_history_column_states")
        .d("Dialogue States Tracking"),
      key: "states",
      dataIndex: "states",
      render: (_, { states }) => (
        <>
          {states.map((state) => {
            return (
              <Tag color={"green"} key={state}>
                {state}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: intl.get("options_app_history_column_status").d("Status"),
      dataIndex: "recordStatus",
      key: "recordStatus",
      filters: [
        {
          text: "Kept",
          value: "Kept",
        },
        {
          text: "Unkept",
          value: "Unkept",
        },
      ],
      onFilter: (value, record) => record.recordStatus === value,
    },
    {
      title: intl.get("options_app_history_column_action").d("Action"),
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          {record.recordStatus !== "Kept" && (
            <a onClick={(e) => keepRecord(record)}>Keep</a>
          )}
          <a onClick={(e) => deleteRecord(record)}>Delete</a>
        </Space>
      ),
    },
  ];

  const interactionColumns: TableColumnsType<InteractionRecord> = [
    {
      title: intl.get("options_app_history_column_uuid").d("Uuid"),
      dataIndex: "uuid",
      key: "uuid",
      render: (text) => text.substring(0, 8).toLowerCase(),
    },
    {
      title: intl.get("options_app_history_column_time").d("Time"),
      dataIndex: "datetime",
      key: "datetime",
      defaultSortOrder: "ascend",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: intl.get("options_app_history_column_agent").d("Agent"),
      dataIndex: "agentName",
      key: "agentName",
    },
    {
      title: intl.get("options_app_history_column_question").d("Question"),
      dataIndex: "inputMessage",
      key: "inputMessage",
      render: (msg: ChatMessage) => msg.getContentText(),
    },
    {
      title: intl.get("options_app_history_column_goal").d("Goal"),
      dataIndex: "goal",
      key: "goal",
    },
    {
      title: intl.get("options_app_history_column_answer").d("Answer"),
      dataIndex: "outputMessage",
      key: "outputMessage",
      render: (msg: ChatMessage) => (msg ? msg.getContentText() : ""),
    },
    {
      title: intl.get("options_app_history_column_intent").d("Intent"),
      dataIndex: "intent",
      key: "intent",
      render: (s: string) => (
        <Tag color={"green"} key={s}>
          {s}
        </Tag>
      ),
    },
    {
      title: intl.get("options_app_history_column_action").d("Action"),
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          {record.like === undefined && (
            <>
              <a onClick={(e) => evaluateInteraction(record, true)}>
                <LikeOutlined />
              </a>
              <a onClick={(e) => evaluateInteraction(record, false)}>
                <DislikeOutlined />
              </a>
            </>
          )}
          {record.like !== undefined &&
            (record.like ? (
              <a onClick={(e) => evaluateInteraction(record, false)}>
                <LikeFilled />
              </a>
            ) : (
              <a onClick={(e) => evaluateInteraction(record, true)}>
                <DislikeFilled />
              </a>
            ))}
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: ConversationRecord) => {
    return (
      <Table<InteractionRecord>
        rowKey="uuid"
        columns={interactionColumns}
        dataSource={record.interactions}
        pagination={false}
      />
    );
  };

  return (
    <>
      <Space className={"conversation-records-desc"}>
        <span>{brief}</span>
        <Popconfirm
          title={intl
            .get("options_app_history_delete_all_title")
            .d("Delete all conversations")}
          description={intl
            .get("options_app_history_delete_all_description")
            .d(
              "Are you sure you want to delete all conversations? This action cannot be undone.",
            )}
          onConfirm={deleteAllRecords}
          okText={intl.get("yes").d("Yes")}
          cancelText={intl.get("no").d("No")}
        >
          <Button danger>
            {intl.get("options_app_history_delete_all_button").d("Delete All")}
          </Button>
        </Popconfirm>
      </Space>
      <Table<ConversationRecord>
        rowKey="uuid"
        columns={columns}
        expandable={{ expandedRowRender }}
        expandRowByClick
        dataSource={records}
        bordered
        footer={() => (
          <Tooltip title="The number of conversation records are limited, the oldest unkept record will be deleted if the total exceeds 1000.">
            {intl
              .get("options_app_history_conversations_total", {
                length: records.length,
              })
              .d(`Total {length} records.`)}
          </Tooltip>
        )}
        pagination={{ pageSize: 10 }}
      />
    </>
  );
};

export default ConversationsManagement;
