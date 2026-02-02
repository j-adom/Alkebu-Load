<script>
  import BookTabAddl from './BookTabAddl.svelte'
  import BookTabDesc from './BookTabDesc.svelte'
  import BookTabCmts from './BookTabCmts.svelte'
  import BookTabComp from './BookTabComp.svelte';
	/**
	 * @typedef {Object} Props
	 * @property {number} [activeTabValue]
	 * @property {any} book
	 */

	/** @type {Props} */
	let { activeTabValue = $bindable(1), book } = $props();


  let items = [
    { label: "Description",
		 value: 1,
		 component: BookTabDesc
		},
    { label: "Additional Info",
		 value: 2,
		 component: BookTabAddl
		},
    { label: "Comments",
		 value: 3,
		 component: BookTabCmts
		}
  ];
  const handleClick = tabValue => () => (activeTabValue = tabValue);
</script>

<div class="grid grid-rows w-full">
	<ul class="tab-btns clear-non list-none">
	{#each items as item}
		<li class="tab-btn {activeTabValue === item.value ? 'active-btn' : ''}">
			<span onclick={handleClick(item.value)}>{item.label}</span>
		</li>
	{/each}
	</ul>

	<div class="box-border w-full">
		{#each items as item}
			{#if activeTabValue == item.value}
			<BookTabComp>
				<item.component {book}/>
			</BookTabComp>
			{/if}
		{/each}
		
	</div>
</div>

<style>
    .box{
        position: relative;
        display: block;
        padding: 0;
    }
</style>