// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Icon } from "@fluentui/react";
import { Alert, Link, Tab, Tabs, Typography, styled as muiStyled } from "@mui/material";
import { useState, useMemo, useCallback, useLayoutEffect } from "react";

import Stack from "@foxglove/studio-base/components/Stack";
import {
  IDataSourceFactory,
  usePlayerSelection,
} from "@foxglove/studio-base/context/PlayerSelectionContext";

import { FormField } from "./FormField";
import View from "./View";

type ConnectionProps = {
  onBack?: () => void;
  onCancel?: () => void;
  availableSources: IDataSourceFactory[];
  activeSource?: IDataSourceFactory;
};

const StyledTabs = muiStyled(Tabs)(({ theme }) => ({
  ".MuiTabs-indicator": {
    right: 0,
    width: "100%",
    backgroundColor: theme.palette.action.hover,
    borderRadius: theme.shape.borderRadius,
  },
  ".MuiTab-root": {
    textAlign: "right",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    minHeight: "auto",
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.5),

    ".MuiTab-iconWrapper": {
      marginBottom: 0,
      marginRight: theme.spacing(1.5),
      fontSize: theme.typography.pxToRem(24),
      color: theme.palette.primary.main,

      "> span": {
        display: "flex",
      },
      svg: {
        fontSize: "inherit",
      },
    },
  },
}));

export default function Connection(props: ConnectionProps): JSX.Element {
  const { availableSources, activeSource, onCancel, onBack } = props;

  const { selectSource } = usePlayerSelection();
  const [selectedConnectionIdx, setSelectedConnectionIdx] = useState<number>(() => {
    const foundIdx = availableSources.findIndex((source) => source === activeSource);
    return foundIdx < 0 ? 0 : foundIdx;
  });

  // List enabled sources before disabled sources so the default selected item is an available source
  const enabledSourcesFirst = useMemo(() => {
    const enabledSources = availableSources.filter((source) => source.disabledReason == undefined);
    const disabledSources = availableSources.filter((source) => source.disabledReason);
    return [...enabledSources, ...disabledSources];
  }, [availableSources]);

  const selectedSource = useMemo(
    () => enabledSourcesFirst[selectedConnectionIdx],
    [enabledSourcesFirst, selectedConnectionIdx],
  );

  const [fieldErrors, setFieldErrors] = useState(new Map<string, string>());
  const [fieldValues, setFieldValues] = useState<Record<string, string | undefined>>({});

  useLayoutEffect(() => {
    const connectionIdx = availableSources.findIndex((source) => source === activeSource);
    if (connectionIdx >= 0) {
      setSelectedConnectionIdx(connectionIdx);
    }
  }, [activeSource, availableSources]);

  // clear field values when the user changes the source tab
  useLayoutEffect(() => {
    const defaultFieldValues: Record<string, string | undefined> = {};
    for (const field of selectedSource?.formConfig?.fields ?? []) {
      if (field.defaultValue != undefined) {
        defaultFieldValues[field.id] = field.defaultValue;
      }
    }
    setFieldValues(defaultFieldValues);
  }, [selectedSource]);

  const onOpen = useCallback(() => {
    if (!selectedSource) {
      return;
    }
    selectSource(selectedSource.id, { type: "connection", params: fieldValues });
  }, [selectedSource, fieldValues, selectSource]);

  const disableOpen = selectedSource?.disabledReason != undefined || fieldErrors.size > 0;

  return (
    <View onBack={onBack} onCancel={onCancel} onOpen={disableOpen ? undefined : onOpen}>
      <Stack direction="row" flexGrow={1} flexWrap="wrap" fullHeight gap={4}>
        <Stack flexBasis={240}>
          <StyledTabs
            textColor="inherit"
            orientation="vertical"
            onChange={(_event, newValue: number) => setSelectedConnectionIdx(newValue)}
            value={selectedConnectionIdx}
          >
            {enabledSourcesFirst.map((source, idx) => {
              const { id, iconName, displayName } = source;
              return (
                <Tab value={idx} key={id} icon={<Icon iconName={iconName} />} label={displayName} />
              );
            })}
          </StyledTabs>
        </Stack>
        <Stack key={selectedSource?.id} flex="1 0" gap={2}>
          {selectedSource?.warning && <Alert severity="warning">{selectedSource.warning}</Alert>}
          {selectedSource?.description && <Typography>{selectedSource.description}</Typography>}
          {selectedSource?.formConfig != undefined && (
            <Stack flexGrow={1} justifyContent="space-between">
              <Stack gap={2}>
                {selectedSource.formConfig.fields.map((field) => (
                  <FormField
                    key={field.id}
                    field={field}
                    disabled={selectedSource.disabledReason != undefined}
                    onError={(err) => {
                      setFieldErrors((existing) => {
                        existing.set(field.id, err);
                        return new Map(existing);
                      });
                    }}
                    onChange={(newValue) => {
                      setFieldErrors((existing) => {
                        existing.delete(field.id);
                        return new Map(existing);
                      });
                      setFieldValues((existing) => {
                        return {
                          ...existing,
                          [field.id]: newValue,
                        };
                      });
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
          {selectedSource?.disabledReason != undefined && (
            <Typography color="text.secondary" variant="body2">
              {selectedSource.disabledReason}
            </Typography>
          )}
          {selectedSource?.docsLink && (
            <Link color="primary" href={selectedSource.docsLink}>
              View docs.
            </Link>
          )}
        </Stack>
      </Stack>
    </View>
  );
}
