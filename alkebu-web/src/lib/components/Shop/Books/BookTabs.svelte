<script>
    import BookTabAddl from "./BookTabAddl.svelte";
    import BookTabCmts from "./BookTabCmts.svelte";
    import BookTabDesc from "./BookTabDesc.svelte";
    import BookTabComp from "./BookTabComp.svelte";

    let { book } = $props();

    let activeTab = $state('description');

</script>

<div class="tabs-container w-full">
    <div class="flex border-b border-gray-200">
        <button
            class="tab-btn px-4 py-2 {activeTab === 'description' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
            onclick={() => activeTab = 'description'}
        >
            <span class="tab-btns">Description</span>
        </button>
        <button
            class="tab-btn px-4 py-2 {activeTab === 'additional' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
            onclick={() => activeTab = 'additional'}
        >
            <span class="tab-btns">Additional Info</span>
        </button>
        <button
            class="tab-btn px-4 py-2 {activeTab === 'comments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
            onclick={() => activeTab = 'comments'}
        >
            <span class="tab-btns">Comments</span>
        </button>
    </div>

    <div class="tab-content w-full">
        {#if activeTab === 'description'}
            <BookTabComp>
                <BookTabDesc {book} />
            </BookTabComp>
        {:else if activeTab === 'additional'}
            <BookTabComp>
                <BookTabAddl {book} />
            </BookTabComp>
        {:else if activeTab === 'comments'}
            <BookTabComp>
                <BookTabCmts {book} />
            </BookTabComp>
        {/if}
    </div>
</div>
