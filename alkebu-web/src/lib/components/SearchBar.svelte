<script>
  import { createBubbler } from 'svelte/legacy';

  const bubble = createBubbler();
  let { searchQuery = $bindable() } = $props();
  </script>

  <style>
    .search-input {
      width: 100%;
      max-width: 800px;
      border-radius: 4px;
      border: 1px solid #ccc;
      padding: 10px 20px;
      font-size: 20px;
      margin-bottom: 50px;
    }
  </style>

<div id="search-input-cont">
	<input type="text" 
				 id="search-field" 
				 placeholder="Enter your search here..." 
				 autocomplete="off"
				 bind:value={searchQuery}
				 oninput={bubble('input')} />
</div> 
