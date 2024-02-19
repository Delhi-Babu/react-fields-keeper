import { useState, useMemo, CSSProperties, useContext, Fragment } from 'react';
import classNames from 'classnames';

import {
    IFieldsKeeperBucket,
    IFieldsKeeperBucketProps,
    IFieldsKeeperItem,
} from './FieldsKeeper.types';
import {
    IGroupedFieldsKeeperItem,
    IGroupedItemRenderer,
    getGroupedItems,
} from '..';
import {
    ContextSetState,
    FieldsKeeperContext,
    useStore,
    useStoreState,
} from './FieldsKeeper.context';

export const FieldsKeeperBucket = (props: IFieldsKeeperBucketProps) => {
    // props
    const {
        id,
        label,
        maxItems = Number.MAX_SAFE_INTEGER,
        disabled = false,
        emptyFieldPlaceholder = 'Add data fields here',
        sortGroupOrderWiseOnAssignment = true,
        instanceId: instanceIdFromProps,
        showExtendedAssignmentPlaceholder = false,
        centerAlignPlaceholder = false,
        placeHolderWrapperClassName,
        wrapperClassName,
    } = props;

    // state
    const [isCurrentFieldActive, setIsCurrentFieldActive] = useState(false);
    const updateState = useStore((state) => state.setState);
    const { instanceId: instanceIdFromContext } =
        useContext(FieldsKeeperContext);
    const instanceId = instanceIdFromProps ?? instanceIdFromContext;

    const { allItems, buckets } = useStoreState(instanceId);

    // compute
    const { currentBucket, groupedItems } = useMemo<{
        groupedItems: IGroupedFieldsKeeperItem[];
        currentBucket: IFieldsKeeperBucket | undefined;
    }>(() => {
        const bucket = buckets.find((bucket) => bucket.id === id);
        if (!bucket) return { groupedItems: [], currentBucket: bucket };

        // group items
        return {
            groupedItems: getGroupedItems(bucket.items),
            currentBucket: bucket,
        };
    }, [buckets, id]);

    const onFieldItemRemove =
        (...fieldItems: IFieldsKeeperItem[]) =>
        () =>
            assignFieldItems({
                instanceId,
                bucketId: id,
                buckets,
                fieldItems,
                sortGroupOrderWiseOnAssignment,
                updateState,

                removeOnly: true,
            });

    // event handlers
    const onDragLeaveHandler = () => {
        setIsCurrentFieldActive(false);
    };

    const onDragEnterHandler = () => {
        setIsCurrentFieldActive(true);
    };

    const onDragOverHandler = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        onDragEnterHandler();
    };

    const onDropHandler = (e: React.DragEvent<HTMLDivElement>) => {
        const fieldItemIds = (e.dataTransfer.getData(instanceId) ?? '').split(
            ',',
        );
        const fieldItems = allItems.filter((item) =>
            fieldItemIds.some((fieldItemId) => item.id === fieldItemId),
        );
        if (fieldItems.length)
            assignFieldItems({
                instanceId,
                bucketId: id,
                buckets,
                sortGroupOrderWiseOnAssignment,
                fieldItems,
                updateState,
            });
        onDragLeaveHandler();
    };

    // compute
    const hasRoomForFieldAssignment = groupedItems.length < maxItems;

    // paint
    const emptyFieldPlaceholderElement = (
        <div
            className={classNames(
                'react-fields-keeper-mapping-content-input-placeholder',
                { 'center-align': centerAlignPlaceholder },
                placeHolderWrapperClassName,
            )}
        >
            {emptyFieldPlaceholder}
        </div>
    );
    if (!currentBucket) return null;
    return (
        <div
            className={classNames(
                'react-fields-keeper-mapping-content',
                wrapperClassName,
            )}
        >
            <div className="react-fields-keeper-mapping-content-title">
                {label}
            </div>
            <div
                className={classNames(
                    'react-fields-keeper-mapping-content-input',
                    {
                        'react-fields-keeper-mapping-content-multi-input':
                            hasRoomForFieldAssignment,
                        'react-fields-keeper-mapping-content-input-active':
                            isCurrentFieldActive,
                        'react-fields-keeper-mapping-content-disabled':
                            disabled,
                    },
                )}
                onDrop={onDropHandler}
                onDragOver={onDragOverHandler}
                onDragEnter={onDragEnterHandler}
                onDragLeave={onDragLeaveHandler}
            >
                {groupedItems.length > 0 &&
                    groupedItems.map((groupedItem, index) => (
                        <GroupedItemRenderer
                            {...props}
                            key={index}
                            groupedItem={groupedItem}
                            currentBucket={currentBucket}
                            onDragOverHandler={onDragOverHandler}
                            onFieldItemRemove={onFieldItemRemove}
                        />
                    ))}
                {(groupedItems.length === 0 ||
                    showExtendedAssignmentPlaceholder === true) &&
                    emptyFieldPlaceholderElement}
            </div>
        </div>
    );
};

const GroupedItemRenderer = (
    props: {
        currentBucket: IFieldsKeeperBucket;
        groupedItem: IGroupedFieldsKeeperItem;
        onDragOverHandler: (e: React.DragEvent<HTMLDivElement>) => void;
        onFieldItemRemove: (...fieldItem: IFieldsKeeperItem[]) => () => void;
    } & IFieldsKeeperBucketProps,
) => {
    // props
    const {
        groupedItem: { items, group, groupLabel },
        allowRemoveFields = false,
        suffixNode,
        instanceId: instanceIdFromProps,
        currentBucket,
        customItemRenderer,
        onDragOverHandler,
        onFieldItemRemove,
    } = props;

    // state
    const { instanceId: instanceIdFromContext } =
        useContext(FieldsKeeperContext);
    const instanceId = instanceIdFromProps ?? instanceIdFromContext;
    const [isGroupCollapsed, setIsGroupCollapsed] = useState(false);

    // compute
    const hasGroup = group !== 'NO_GROUP';

    // handlers
    // event handlers
    const onDragStartHandler =
        (...fieldItems: IFieldsKeeperItem[]) =>
        (e: React.DragEvent<HTMLDivElement>) => {
            e.dataTransfer.setData(
                instanceId,
                fieldItems.map((item) => item.id).join(','),
            );
        };

    // paint
    const renderFieldItems = ({
        fieldItems,
        isGroupItem,
        groupHeader,
    }: IGroupedItemRenderer) => {
        // compute
        const isGroupHeader = groupHeader !== undefined;

        // styles
        const itemStyle = (
            isGroupHeader
                ? {
                      '--bucket-group-items-count':
                          groupHeader.groupItems.length + 1,
                  }
                : {}
        ) as CSSProperties;

        // paint
        return fieldItems.map((fieldItem, fieldIndex) => {
            // handlers
            const remove = onFieldItemRemove(
                ...(isGroupHeader ? groupHeader.groupItems : [fieldItem]),
            );
            const getDefaultItemRenderer = () => (
                <Fragment>
                    <div className="react-fields-keeper-mapping-content-input-filled-value">
                        {fieldItem.label}
                    </div>
                    {isGroupHeader && (
                        <div
                            className={classNames(
                                'react-fields-keeper-mapping-column-content-action',
                            )}
                            role="button"
                            onClick={groupHeader.onGroupHeaderToggle}
                        >
                            {groupHeader.isGroupCollapsed ? (
                                <i className="fk-ms-Icon fk-ms-Icon--ChevronRight" />
                            ) : (
                                <i className="fk-ms-Icon fk-ms-Icon--ChevronDown" />
                            )}
                        </div>
                    )}
                    {suffixNode ||
                        (allowRemoveFields && (
                            <div
                                className={classNames(
                                    'react-fields-keeper-mapping-content-input-filled-close',
                                )}
                                role="button"
                                onClick={remove}
                            >
                                <i className="fk-ms-Icon fk-ms-Icon--ChromeClose" />
                            </div>
                        ))}
                </Fragment>
            );

            // paint
            return (
                <div
                    key={fieldItem.id}
                    className={classNames(
                        'react-fields-keeper-tooltip-wrapper',
                        {
                            'react-fields-keeper-tooltip-disabled-pointer':
                                fieldItem.disabled?.active,
                        },
                    )}
                    title={
                        (fieldItem.disabled?.active
                            ? fieldItem.disabled?.message
                            : fieldItem.tooltip) ?? fieldItem.tooltip
                    }
                >
                    <div
                        className={classNames(
                            'react-fields-keeper-mapping-content-input-filled',
                            fieldItem.activeNodeClassName,
                            {
                                'react-fields-keeper-mapping-content-input-filled-offset':
                                    isGroupItem,
                                'react-fields-keeper-mapping-content-input-filled-bottom-offset':
                                    isGroupItem &&
                                    fieldIndex === fieldItems.length - 1,
                                'react-fields-keeper-mapping-content-input-filled-group-header':
                                    isGroupHeader,
                                'react-fields-keeper-mapping-content-input-filled-group-header-after':
                                    isGroupHeader &&
                                    !groupHeader.isGroupCollapsed,
                                'react-fields-keeper-mapping-content-input-filled-disabled':
                                    fieldItem.disabled?.active,
                                'react-fields-keeper-mapping-content-input-filled-custom-renderer':
                                    customItemRenderer !== undefined,
                            },
                        )}
                        style={itemStyle}
                        draggable
                        onDragStart={onDragStartHandler(
                            ...(isGroupHeader
                                ? groupHeader.groupItems
                                : [fieldItem]),
                        )}
                        onDragOver={onDragOverHandler}
                    >
                        {customItemRenderer !== undefined
                            ? customItemRenderer({
                                  bucketId: currentBucket.id,
                                  fieldItem,
                                  remove,
                                  getDefaultItemRenderer,
                              })
                            : getDefaultItemRenderer()}
                    </div>
                </div>
            );
        });
    };

    if (hasGroup) {
        let disabled = items.find((item) => item.disabled?.active)?.disabled;

        const shouldDisabledGroupLabel =
            items.length > 1 ? disabled?.disableGroupLabel ?? true : true;

        if (disabled) {
            disabled = {
                ...disabled,
                active: shouldDisabledGroupLabel,
            };
        }

        return (
            <>
                {renderFieldItems({
                    fieldItems: [
                        {
                            label: groupLabel,
                            id: group,
                            group,
                            groupLabel,
                            disabled,
                        },
                    ],
                    groupHeader: {
                        groupItems: items,
                        isGroupCollapsed,
                        onGroupHeaderToggle: () =>
                            setIsGroupCollapsed(!isGroupCollapsed),
                    },
                })}
                {!isGroupCollapsed &&
                    renderFieldItems({
                        fieldItems: items,
                        isGroupItem: true,
                    })}
            </>
        );
    }
    return <>{renderFieldItems({ fieldItems: items })}</>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function assignFieldItems(props: {
    instanceId: string;
    bucketId: string | null;
    buckets: IFieldsKeeperBucket[];
    fieldItems: IFieldsKeeperItem[];
    updateState: ContextSetState;
    removeOnly?: boolean;
    sortGroupOrderWiseOnAssignment?: boolean;
}) {
    // props
    const {
        instanceId,
        bucketId,
        buckets,
        fieldItems: currentFieldItems,
        updateState,
        removeOnly = false,
        sortGroupOrderWiseOnAssignment = false,
    } = props;

    const requiredFieldItems = currentFieldItems.filter(
        (item) => (item.rootDisabled ?? item.disabled)?.active !== true,
    );

    // compute
    const newBuckets = [...buckets];
    newBuckets.forEach((bucket) => {
        // removes item from old bucket
        bucket.items = bucket.items.filter(
            (item) =>
                requiredFieldItems.some(
                    (fieldItem) => fieldItem.id === item.id,
                ) === false,
        );

        // insert new item into bucket
        if (!removeOnly && bucket.id === bucketId)
            bucket.items.push(...requiredFieldItems);

        // sort the same group items based on the group order
        if (sortGroupOrderWiseOnAssignment)
            bucket.items = sortBucketItemsBasedOnGroupOrder(bucket.items);
    });

    // update context
    updateState(instanceId, { buckets: newBuckets });
}

// eslint-disable-next-line react-refresh/only-export-components
export function sortBucketItemsBasedOnGroupOrder(
    items: IFieldsKeeperItem[],
): IFieldsKeeperItem[] {
    // grouping based on the group property
    const chunkGroups = items.reduce<
        { group: string; items: IFieldsKeeperItem[] }[]
    >((result, current, index) => {
        let groupBucket = result.find(
            (item) => item.group === (current.group ?? index.toString()),
        );
        if (!groupBucket) {
            groupBucket = {
                group: current.group ?? index.toString(),
                items: [],
            };
            result.push(groupBucket);
        }
        groupBucket.items.push(current);
        return result;
    }, []);

    // sorting if found valid groups
    const sortedItems = chunkGroups.reduce<IFieldsKeeperItem[]>(
        (result, current) => {
            if (current.items.length > 1) {
                // sort the groups based on group order
                current.items.sort((itemA, itemB) => {
                    if (
                        itemA.groupOrder !== undefined &&
                        itemB.groupOrder !== undefined
                    ) {
                        return itemA.groupOrder - itemB.groupOrder;
                    }
                    return 0;
                });
            }
            result.push(...current.items);
            return result;
        },
        [],
    );

    return sortedItems;
}
