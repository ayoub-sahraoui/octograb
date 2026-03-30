import { observer } from 'mobx-react-lite';
import { LoopPaginationBlock } from '@/entrypoints/models/loop-pagination-block';
import { SelectorType } from '@/entrypoints/models/selector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SelectorInput } from '../selector-input';
import { useState } from 'react';
import { browser } from 'wxt/browser';
import { sendToTab } from '@/core/messaging';

interface LoopPaginationBlockConfigProps {
    block: LoopPaginationBlock;
}

export const LoopPaginationBlockConfig = observer(({ block }: LoopPaginationBlockConfigProps) => {
    const paginationType = block.config.paginationType || 'button';
    const [scrollPosition, setScrollPosition] = useState<{ current: number, total: number } | null>(null);
    const [isGettingPosition, setIsGettingPosition] = useState(false);

    const getCurrentScrollPosition = async () => {
        setIsGettingPosition(true);
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tabs[0]?.id) {
                console.error('No active tab');
                return;
            }

            const response = await sendToTab(tabs[0].id, {
                type: 'ENV_SCROLL',
                data: {
                    target: block.config.scrollTarget || 'window',
                    behavior: 'pixels',
                    amount: 0, // Don't scroll, just get position
                    selector: block.config.scrollSelector?.value,
                    selectorType: block.config.scrollSelector?.type || 'css',
                }
            } as any);

            if (response.success && response.data) {
                const info = response.data as any;
                setScrollPosition({
                    current: info.afterScrollTop,
                    total: info.scrollHeight
                });
            }
        } catch (error) {
            console.error('Failed to get scroll position:', error);
        } finally {
            setIsGettingPosition(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="paginationType">Pagination Type</Label>
                <Select
                    value={paginationType}
                    onValueChange={(value: any) => block.setPaginationType(value)}
                >
                    <SelectTrigger id="paginationType">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="button">Button Click</SelectItem>
                        <SelectItem value="scroll">Scroll to Load More</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Choose between button-click or scroll-to-load pagination
                </p>
            </div>

            {paginationType === 'button' && (
                <SelectorInput
                    label="Next Button Selector"
                    id="pagination-next-selector"
                    placeholder=".next-page, a[rel='next']"
                    helpText="Select the 'Next' button or link to click for pagination"
                    selector={block.config.nextButtonSelector}
                    onSelectorChange={(sel) => block.setNextButtonSelector(sel)}
                    block={block}
                    expectedElement="clickable"
                    selectorCardinality="single"
                />
            )}

            {paginationType === 'scroll' && (
                <>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="scrollStrategy">Scroll Strategy</Label>
                        <Select
                            value={block.config.scrollStrategy || 'fixed_amount'}
                            onValueChange={(value: any) => block.setScrollStrategy(value)}
                        >
                            <SelectTrigger id="scrollStrategy">
                                <SelectValue placeholder="Select strategy" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                                <SelectItem value="scroll_to_bottom">Scroll to Bottom</SelectItem>
                                <SelectItem value="scroll_to_last_item">Scroll to Last Item</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {block.config.scrollStrategy === 'scroll_to_bottom' && 'Scroll to bottom, wait for items to load'}
                            {block.config.scrollStrategy === 'scroll_to_last_item' && 'Find items and scroll to the last one'}
                            {(!block.config.scrollStrategy || block.config.scrollStrategy === 'fixed_amount') && 'Scroll by a fixed pixel amount each iteration'}
                        </p>
                    </div>

                    {block.config.scrollStrategy === 'scroll_to_last_item' && (
                        <SelectorInput
                            label="Item Selector"
                            id="item-selector"
                            placeholder=".product-item"
                            helpText="Selector for the items to scroll through"
                            selector={block.config.itemSelector || { type: SelectorType.CSS, value: '' }}
                            onSelectorChange={(sel) => block.setItemSelector(sel)}
                            block={block}
                            selectorCardinality="multiple"
                        />
                    )}

                    {(!block.config.scrollStrategy || block.config.scrollStrategy === 'fixed_amount') && (
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="scrollTarget">Scroll Target</Label>
                            <Select
                                value={block.config.scrollTarget || 'window'}
                                onValueChange={(value: any) => block.setScrollTarget(value)}
                            >
                                <SelectTrigger id="scrollTarget">
                                    <SelectValue placeholder="Select target" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="window">Window</SelectItem>
                                    <SelectItem value="element">Element</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Scroll the window or a specific element
                            </p>
                        </div>
                    )}

                    {(!block.config.scrollStrategy || block.config.scrollStrategy === 'fixed_amount') && block.config.scrollTarget === 'element' && (
                        <SelectorInput
                            label="Scroll Element Selector"
                            id="scroll-selector"
                            placeholder=".scrollable-container"
                            helpText="Selector for the scrollable element"
                            selector={block.config.scrollSelector || { type: SelectorType.CSS, value: '' }}
                            onSelectorChange={(sel) => block.setScrollSelector(sel)}
                            block={block}
                            selectorCardinality="single"
                        />
                    )}

                    {(!block.config.scrollStrategy || block.config.scrollStrategy === 'fixed_amount') && (
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="scrollAmount">Scroll Amount (px)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="scrollAmount"
                                    type="number"
                                    placeholder="1000"
                                    value={block.config.scrollAmount || ''}
                                    onChange={(e) => block.setScrollAmount(parseInt(e.target.value) || 1000)}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={getCurrentScrollPosition}
                                    disabled={isGettingPosition}
                                    className="whitespace-nowrap"
                                >
                                    {isGettingPosition ? 'Getting...' : 'Get Position'}
                                </Button>
                            </div>
                            {scrollPosition && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <p className="text-sm font-semibold text-emerald-900 mb-1">📊 Current Scroll Position</p>
                                    <p className="text-xs text-emerald-700">
                                        <span className="font-mono font-semibold">{scrollPosition.current}px</span> / {scrollPosition.total}px
                                        <span className="ml-2 text-emerald-600">
                                            ({Math.round((scrollPosition.current / scrollPosition.total) * 100)}%)
                                        </span>
                                    </p>
                                    <p className="text-xs text-emerald-600 mt-1">
                                        Remaining: <span className="font-mono font-semibold">{scrollPosition.total - scrollPosition.current}px</span>
                                    </p>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                How many pixels to scroll each iteration
                            </p>
                        </div>
                    )}
                </>
            )}

            <div className="flex flex-col gap-2">
                <Label htmlFor="maxPages">Max Pages</Label>
                <Input
                    id="maxPages"
                    type="number"
                    placeholder="Unlimited"
                    value={block.config.maxPages || ''}
                    onChange={(e) => block.setMaxPages(parseInt(e.target.value) || undefined)}
                />
                <p className="text-xs text-muted-foreground">
                    Leave empty for unlimited pages
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="delayBetweenPages">Delay Between Pages (ms)</Label>
                <Input
                    id="delayBetweenPages"
                    type="number"
                    placeholder="1000"
                    value={block.config.delayBetweenPages || ''}
                    onChange={(e) => block.setDelayBetweenPages(parseInt(e.target.value) || 1000)}
                />
                <p className="text-xs text-muted-foreground">
                    Time to wait between pagination iterations
                </p>
            </div>
        </div>
    );
});
